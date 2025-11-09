/**
 * useCommentSidebar.ts - Comprehensive Comment Sidebar State Hook
 *
 * Architecture: App-specific orchestration layer over @workspace/shared/comments
 * - Absorbs: useCommentsQuery, useCommentMutations from shared
 * - Extracts: Realtime logic, threading, filtering, form state, mutation handlers
 * - Preserves: Gap G6 error handling (retry + user-friendly messages)
 * - Provides: Pure data + callbacks for component consumption
 *
 * Complexity: Business logic layer (~700 LOC in POC, streamlined with shared primitives)
 * Component: <300 LOC (pure UI consumer)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useQueryClient } from '@tanstack/react-query';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@workspace/shared/auth';
import {
  useCommentMutations,
  useCommentsQuery,
  createComment as createCommentInDB,
  updateComment,
  clearUserProfileCache,
  SCRIPTS_WEB_CAPABILITIES,
  type CommentWithUser,
  type CommentThread,
  type CreateCommentData,
} from '@workspace/shared/comments';
import { Logger } from '@workspace/shared/services';
import { useErrorHandling, getUserFriendlyErrorMessage } from '../../utils/errorHandling';

// Supabase Realtime postgres_changes payload structure
interface RealtimePostgresChangesPayload<T = Record<string, unknown>> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
  errors: string[] | null;
}

// Types extracted from CommentSidebar
export type FilterMode = 'all' | 'open' | 'resolved';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'degraded';

export interface CommentSidebarHookProps {
  scriptId: string;
  createComment?: {
    startPosition: number;
    endPosition: number;
    selectedText: string;
  } | null;
  onCommentCreated?: (commentData: CreateCommentData) => void;
  onCommentCancelled?: () => void;
  onCommentDeleted?: (commentId: string) => void;
}

export interface CommentThreadWithNumber extends CommentThread {
  commentNumber: number;
}

/**
 * Comprehensive sidebar hook - encapsulates ALL comment sidebar logic
 *
 * Returns:
 * - Data: threads, loading, error, connectionStatus
 * - State: filterMode, form states (reply, edit, delete)
 * - Mutations: create, reply, edit, delete, resolve (with Gap G6 error handling)
 * - Permissions: canDeleteComment, canEditComment
 */
export function useCommentSidebar({
  scriptId,
  createComment,
  onCommentCreated,
  onCommentCancelled,
  onCommentDeleted
}: CommentSidebarHookProps) {
  const { userProfile } = useAuth();
  const { executeWithErrorHandling } = useErrorHandling('comment operations');
  const queryClient = useQueryClient();

  // ========== EXISTING HOOKS ==========
  // Absorb: Data fetching and mutations from shared
  const commentsQuery = useCommentsQuery(scriptId);
  const comments = useMemo(() => commentsQuery.data || [], [commentsQuery.data]);
  const loading = commentsQuery.isLoading;
  const queryError = commentsQuery.error
    ? getUserFriendlyErrorMessage(commentsQuery.error, { operation: 'load', resource: 'comments' })
    : null;

  const { resolveMutation, unresolveMutation, deleteMutation } = useCommentMutations(SCRIPTS_WEB_CAPABILITIES);

  // ========== STATE MANAGEMENT ==========
  // Extract: ALL useState from component

  // Mutation error state (prioritized over query error)
  const [mutationError, setMutationError] = useState<string | null>(null);
  const error = mutationError || queryError;

  // Filter mode
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Connection state for realtime resilience
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const [reconnectionTimer, setReconnectionTimer] = useState<NodeJS.Timeout | null>(null);
  const reconnectionAttemptsRef = useRef(0);

  // Comment creation form state
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Universal comment form state
  const [showUniversalForm, setShowUniversalForm] = useState(false);

  // Reply functionality state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit functionality state
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete functionality state
  const [deleteConfirming, setDeleteConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ========== REALTIME SUBSCRIPTION ==========
  // Realtime subscription effect
  useEffect(() => {
    if (!scriptId) return;

    const isCancelledRef = { current: false };

    const channel = supabase
      .channel(`comments:${scriptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        async (payload: RealtimePostgresChangesPayload) => {
          // Ignore hard DELETE events - application uses soft deletes
          if (payload.eventType === 'DELETE') {
            Logger.info('Ignoring hard DELETE event (application uses soft deletes)', {
              table: payload.table,
              commentId: payload.old?.id,
            });
            return;
          }

          // Server-side refetch for RLS validation
          await commentsQuery.refetch();

          Logger.info('Realtime event processed', {
            eventType: payload.eventType,
            commentId: payload.new?.id || payload.old?.id,
          });
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
        if (status === 'SUBSCRIBED') {
          Logger.info('Realtime channel subscribed', { scriptId });
          setConnectionStatus('connected');
          reconnectionAttemptsRef.current = 0;
          if (reconnectionTimer) {
            clearTimeout(reconnectionTimer);
            setReconnectionTimer(null);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const eventType = status === 'CHANNEL_ERROR' ? 'error' : status === 'TIMED_OUT' ? 'timeout' : 'closed';
          Logger.warn(`Realtime channel ${eventType}`, { scriptId });

          reconnectionAttemptsRef.current += 1;
          const nextAttempt = reconnectionAttemptsRef.current;

          if (nextAttempt >= 4) {
            Logger.error('Realtime connection degraded after 4 failed attempts', { scriptId });
            setConnectionStatus('degraded');
            return;
          }

          setConnectionStatus('reconnecting');

          const baseDelay = Math.pow(2, nextAttempt) * 1000;
          const jitter = Math.random() * 500;
          const delay = baseDelay + jitter;

          Logger.info(`Scheduling reconnection attempt ${nextAttempt}`, {
            scriptId,
            delayMs: Math.round(delay)
          });

          const timer = setTimeout(() => {
            if (isCancelledRef.current) {
              Logger.info('Reconnection cancelled (component unmounted)', { scriptId });
              return;
            }

            Logger.info(`Executing reconnection attempt ${nextAttempt}`, { scriptId });
            channel.subscribe();
          }, delay);

          setReconnectionTimer(timer);
        }
      });

    return () => {
      isCancelledRef.current = true;
      Logger.info('Unsubscribing from realtime channel', { scriptId });
      if (reconnectionTimer) {
        clearTimeout(reconnectionTimer);
      }
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);

  // ========== CACHE CLEANUP ==========
  useEffect(() => {
    return () => {
      clearUserProfileCache();
      Logger.info('User profile cache cleared', { scriptId });
    };
  }, [scriptId]);

  // ========== THREADING & FILTERING ==========
  const threads = useMemo((): CommentThreadWithNumber[] => {
    // Filter by resolved status
    const filteredComments = comments.filter(comment => {
      if (!comment) return false;

      if (filterMode === 'open') {
        return !comment.resolvedAt;
      } else if (filterMode === 'resolved') {
        return !!comment.resolvedAt;
      }
      return true; // 'all'
    });

    // Group into threads with numbering
    const commentThreads: CommentThreadWithNumber[] = [];
    const threadMap = new Map<string, CommentThreadWithNumber>();

    // Collect parent comments sorted by position
    const parentComments = filteredComments
      .filter(comment => comment && !comment.parentCommentId)
      .sort((a, b) => a.startPosition - b.startPosition);

    parentComments.forEach((comment, index) => {
      const thread: CommentThreadWithNumber = {
        id: comment.id,
        parentComment: comment,
        replies: [],
        isResolved: !!comment.resolvedAt,
        replyCount: 0,
        commentNumber: index + 1,
      };
      threadMap.set(comment.id, thread);
      commentThreads.push(thread);
    });

    // Add replies to parent threads
    filteredComments.forEach(comment => {
      if (comment.parentCommentId) {
        const parentThread = threadMap.get(comment.parentCommentId);
        if (parentThread) {
          parentThread.replies.push(comment);
          parentThread.replyCount++;
        }
      }
    });

    return commentThreads;
  }, [comments, filterMode]);

  // ========== MUTATION HANDLERS ==========

  // Create comment
  const handleCreateComment = useCallback(async () => {
    if (!createComment || !commentText.trim() || !userProfile) return;

    if (scriptId.startsWith('readonly-')) return;

    setSubmitting(true);
    setMutationError(null);

    const commentData: CreateCommentData = {
      scriptId,
      content: commentText.trim(),
      startPosition: createComment.startPosition,
      endPosition: createComment.endPosition,
      parentCommentId: null,
      highlightedText: DOMPurify.sanitize(createComment.selectedText, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      }),
    };

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticComment: CommentWithUser = {
      id: tempId,
      scriptId,
      userId: userProfile.id,
      content: commentData.content,
      startPosition: commentData.startPosition,
      endPosition: commentData.endPosition,
      highlightedText: commentData.highlightedText,
      parentCommentId: null,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: userProfile.id,
        email: userProfile.email || '',
        displayName: userProfile.display_name || null
      }
    };

    const cacheKey = ['comments', scriptId, userProfile.id];

    queryClient.setQueryData<CommentWithUser[]>(
      cacheKey,
      (oldComments = []) => [...oldComments, optimisticComment]
    );

    const result = await executeWithErrorHandling(
      async () => {
        const response = await createCommentInDB(supabase, commentData, userProfile.id, SCRIPTS_WEB_CAPABILITIES);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to create comment');
        }

        queryClient.setQueryData<CommentWithUser[]>(
          cacheKey,
          (oldComments = []) =>
            oldComments.map(c => c.id === tempId ? response.data! : c)
        );

        return response.data;
      },
      (errorInfo) => {
        queryClient.setQueryData<CommentWithUser[]>(
          cacheKey,
          (oldComments = []) => oldComments.filter(c => c.id !== tempId)
        );

        const contextualMessage = getUserFriendlyErrorMessage(
          new Error(errorInfo.message),
          { operation: 'create', resource: 'comment' }
        );
        setMutationError(contextualMessage);
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );

    if (result.success) {
      setCommentText('');
      if (onCommentCreated) {
        onCommentCreated(commentData);
      }
    }

    setSubmitting(false);
  }, [createComment, commentText, userProfile, scriptId, queryClient, executeWithErrorHandling, onCommentCreated]);

  const handleCancelComment = useCallback(() => {
    setCommentText('');
    if (onCommentCancelled) {
      onCommentCancelled();
    }
  }, [onCommentCancelled]);

  // Create universal comment
  const handleCreateUniversalComment = useCallback(async () => {
    if (!commentText.trim() || !userProfile) return;

    if (scriptId.startsWith('readonly-')) return;

    setSubmitting(true);
    setMutationError(null);

    const commentData: CreateCommentData = {
      scriptId,
      content: commentText.trim(),
      startPosition: 0,
      endPosition: 1,
      parentCommentId: null,
      highlightedText: undefined,
    };

    const result = await executeWithErrorHandling(
      async () => {
        const response = await createCommentInDB(supabase, commentData, userProfile.id, SCRIPTS_WEB_CAPABILITIES);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to create comment');
        }
        return response.data;
      },
      (errorInfo) => {
        setMutationError(errorInfo.userMessage);
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );

    if (result.success) {
      setCommentText('');
      setShowUniversalForm(false);
      await commentsQuery.refetch();
    }

    setSubmitting(false);
  }, [commentText, userProfile, scriptId, executeWithErrorHandling, commentsQuery]);

  // Reply handlers
  const handleReplyClick = useCallback((commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async (parentCommentId: string) => {
    if (!replyText.trim() || !userProfile) return;

    setSubmittingReply(true);
    setMutationError(null);

    const parentComment = comments.find(c => c.id === parentCommentId);

    const replyData: CreateCommentData = {
      scriptId,
      content: replyText.trim(),
      startPosition: parentComment?.startPosition || 0,
      endPosition: parentComment?.endPosition || 0,
      parentCommentId,
    };

    const result = await executeWithErrorHandling(
      async () => {
        const response = await createCommentInDB(supabase, replyData, userProfile.id, SCRIPTS_WEB_CAPABILITIES);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to create reply');
        }

        return response.data;
      },
      (errorInfo) => {
        const contextualMessage = getUserFriendlyErrorMessage(
          new Error(errorInfo.message),
          { operation: 'reply', resource: 'reply' }
        );
        setMutationError(contextualMessage);
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );

    if (result.success) {
      setReplyingTo(null);
      setReplyText('');
    }

    setSubmittingReply(false);
  }, [replyText, userProfile, scriptId, comments, executeWithErrorHandling]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, []);

  // Resolve/unresolve handlers
  const handleResolveToggle = useCallback(async (commentId: string, isCurrentlyResolved: boolean) => {
    if (!userProfile) return;

    setMutationError(null);

    const operation = isCurrentlyResolved ? 'unresolve' : 'resolve';
    const mutationOptions = {
      onError: (error: Error) => {
        const contextualMessage = getUserFriendlyErrorMessage(
          error,
          { operation, resource: 'comment' }
        );
        setMutationError(contextualMessage);
      }
    };

    if (isCurrentlyResolved) {
      unresolveMutation.mutate({ commentId, scriptId }, mutationOptions);
    } else {
      resolveMutation.mutate({ commentId, scriptId }, mutationOptions);
    }
  }, [userProfile, scriptId, resolveMutation, unresolveMutation]);

  // Delete handlers
  const handleDeleteClick = useCallback((commentId: string) => {
    setDeleteConfirming(commentId);
  }, []);

  const handleDeleteConfirm = useCallback(async (commentId: string) => {
    if (!userProfile) return;

    setDeleting(true);
    setMutationError(null);

    deleteMutation.mutate(
      { commentId, scriptId },
      {
        onSuccess: () => {
          if (onCommentDeleted) {
            onCommentDeleted(commentId);
          }
          setDeleteConfirming(null);
          setDeleting(false);
        },
        onError: (error) => {
          const contextualMessage = getUserFriendlyErrorMessage(
            error as Error,
            { operation: 'delete', resource: 'comment' }
          );
          setMutationError(contextualMessage);
          setDeleting(false);
        }
      }
    );
  }, [userProfile, scriptId, deleteMutation, onCommentDeleted]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirming(null);
  }, []);

  // Edit handlers
  const handleEditClick = useCallback((comment: CommentWithUser) => {
    setEditing(comment.id);
    setEditText(comment.content);
  }, []);

  const handleEditSubmit = useCallback(async (commentId: string) => {
    if (!editText.trim() || !userProfile) return;

    setSubmittingEdit(true);
    setMutationError(null);

    const result = await executeWithErrorHandling(
      async () => {
        const response = await updateComment(supabase, commentId, { content: editText.trim() }, userProfile.id);

        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to update comment');
        }

        return response.data;
      },
      (errorInfo) => {
        const contextualMessage = getUserFriendlyErrorMessage(
          new Error(errorInfo.message),
          { operation: 'update', resource: 'comment' }
        );
        setMutationError(contextualMessage);
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );

    if (result.success) {
      setEditing(null);
      setEditText('');
    }

    setSubmittingEdit(false);
  }, [editText, userProfile, executeWithErrorHandling]);

  const handleEditCancel = useCallback(() => {
    setEditing(null);
    setEditText('');
  }, []);

  // ========== PERMISSIONS ==========
  const canDeleteComment = useCallback((comment: CommentWithUser) => {
    return userProfile && comment.userId === userProfile.id;
  }, [userProfile]);

  const canEditComment = useCallback((comment: CommentWithUser) => {
    return userProfile && comment.userId === userProfile.id;
  }, [userProfile]);

  // ========== RETURN INTERFACE ==========
  return {
    // Data
    threads,
    loading,
    error,

    // Connection state
    connectionStatus,

    // Filter state
    filterMode,
    setFilterMode,

    // Comment creation state
    commentText,
    setCommentText,
    submitting,
    handleCreateComment,
    handleCancelComment,

    // Universal comment state
    showUniversalForm,
    setShowUniversalForm,
    handleCreateUniversalComment,

    // Reply state
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    submittingReply,
    handleReplyClick,
    handleReplySubmit,
    handleCancelReply,

    // Edit state
    editing,
    setEditing,
    editText,
    setEditText,
    submittingEdit,
    handleEditClick,
    handleEditSubmit,
    handleEditCancel,

    // Delete state
    deleteConfirming,
    setDeleteConfirming,
    deleting,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleDeleteClick,

    // Resolve state
    handleResolveToggle,

    // Permissions
    canDeleteComment,
    canEditComment,

    // Error management
    setMutationError,
  };
}
