import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useWorkout } from "../context/WorkoutContext";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Heart,
  MessageCircle,
  Share2,
  Timer,
  X,
  Send,
  ExternalLink,
  ChevronLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { Workout } from "../types";

import PageHeader from "../components/PageHeader";

interface Post {
  id: string;
  userId: string;
  userName: string;
  workoutName: string;
  duration: number;
  volume: number;
  exercises?: any[];
  likes: string[];
  commentsCount: number;
  comments?: {
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
  }[];
  timestamp: any;
}

const formatDuration = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
};

const SocialPostCard: React.FC<{
  post: Post;
  user: any;
  toggleLike: (postId: string, isLiked: boolean) => void;
  showToast: (msg: string) => void;
  setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;
}> = ({ post, user, toggleLike, showToast, setPosts }) => {
  const isLiked = user && post.likes?.includes(user?.uid);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleShare = async () => {
    const shareText = `Check out my workout on BarDrop! ${post.workoutName} — ${post.volume.toLocaleString()} lbs lifted.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BarDrop Workout",
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      await navigator.clipboard.writeText(
        `${shareText} ${window.location.href}`,
      );
      showToast("Workout copied to clipboard!");
    }
  };

  const handleExecuteFinalDelete = async () => {
    try {
      console.log("SENDING DELETE REQ FOR ID:", post.id);

      // Reference the exact root collection checked in image_9be0f4.png
      const postDocRef = doc(db, "social_feed", post.id);

      // Force strict await synchronization
      await deleteDoc(postDocRef);

      console.log("SERVER ACKNOWLEDGED DELETION");

      setIsVisible(false);

      // CRITICAL: Force the local UI array state to slice out the card immediately
      if (typeof setPosts === "function") {
        setPosts((prevPosts) => prevPosts.filter((p) => p.id !== post.id));
      } else {
        console.warn(
          "setPosts hook missing from component lifecycle layout context.",
        );
      }
    } catch (error) {
      console.error("Firestore delete error:", error);
    }
  };

  const handleStealRoutine = async () => {
    if (!user) {
      showToast("Please log in to save routines.");
      return;
    }

    try {
      // Target the current logged-in user's personalized routines sub-collection
      const userRoutinesRef = collection(db, "users", user.uid, "routines");

      // Fallback to a default structure if the deep exercises array fields are empty
      const routineExercises =
        post.exercises && post.exercises.length > 0
          ? post.exercises.map((ex: any) => ({
              name: ex.name,
              exerciseId: ex.exerciseId || "",
              order: ex.order || 0,
              sets: ex.sets
                ? ex.sets.map((s: any, idx: number) => ({
                    id: `cloned_set_${idx}_${Date.now()}`,
                    type: s.type || "normal",
                    weight: s.weight || 0,
                    reps: s.reps || 0,
                    completed: false,
                  }))
                : [],
            }))
          : [
              {
                name: "Target Exercise Placeholder",
                exerciseId: "default_e1",
                order: 0,
                sets: [
                  { id: `set_${Date.now()}`, type: "normal", weight: 45, reps: 10, completed: false }
                ],
              },
            ];

      const clonedRoutinePayload = {
        title: `${post.userName || "Friend"}'s ${post.workoutName || "Workout"}`,
        createdAt: new Date(),
        exercises: routineExercises,
      };

      console.log("Pushing cloned routine configuration to Firestore:", clonedRoutinePayload);
      await addDoc(userRoutinesRef, clonedRoutinePayload);
      
      showToast("Routine successfully added to your saved templates!");
    } catch (error) {
      console.error("Routine cloning failed to execute:", error);
    }
  };

  const handleDeleteComment = async (postId: string, commentObj: any) => {
    try {
      const postDocRef = doc(db, "social_feed", postId);
      await updateDoc(postDocRef, {
        comments: arrayRemove(commentObj),
        commentsCount: Math.max((post.commentsCount || 0) - 1, 0),
      });
    } catch (error) {
      console.error("Failed to extract comment from array map:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;
    try {
      const newComment = {
        userId: user.uid,
        userName: user.displayName || "Anonymous Lifter",
        text: commentText.trim(),
        timestamp: Date.now(),
      };
      await updateDoc(doc(db, "social_feed", post.id), {
        comments: [...(post.comments || []), newComment],
        commentsCount: (post.commentsCount || 0) + 1,
      });
      setCommentText("");
    } catch (e) {
      console.error(e);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg shadow-black/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center font-bold text-blue-400 border border-gray-700">
            {post.userName?.[0] || "U"}
          </div>
          <div>
            <h3 className="font-bold text-white tracking-tight">
              {post.userName || "Anonymous Lifter"}
            </h3>
            <p className="text-xs text-gray-500 font-mono">
              {post.timestamp?.toDate
                ? post.timestamp.toDate().toLocaleString()
                : post.timestamp instanceof Date
                  ? post.timestamp.toLocaleString()
                  : "Just now"}
            </p>
          </div>
        </div>
        {user &&
          user.uid === post.userId &&
          (isConfirmingDelete ? (
            <div className="flex gap-2 items-center">
              <button
                onClick={handleExecuteFinalDelete}
                className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="bg-gray-800 text-gray-300 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="text-gray-500 hover:text-red-400 transition-colors p-2"
              title="Delete Post"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ))}
      </div>

      <div className="mb-5 relative z-10">
        <h4 className="text-xl font-bold text-white mb-3">
          {post.workoutName}
        </h4>
        <div className="flex flex-wrap gap-3 text-sm font-mono text-gray-300">
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">
            <Timer className="w-4 h-4 text-blue-400" />
            {formatDuration(post.duration)}
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">
            <strong className="text-blue-400">
              {post.volume.toLocaleString()}
            </strong>{" "}
            vol
          </div>
          {post.exercises && post.exercises.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
              {post.exercises.length} Exercises
            </button>
          )}
        </div>
      </div>

      {isExpanded && post.exercises && (
        <div className="mb-4 space-y-2 relative z-10">
          {post.exercises.map((ex, idx) => (
            <div
              key={idx}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3"
            >
              <h5 className="font-bold text-sm text-gray-200 mb-2">
                {ex.name}
              </h5>
              <div className="flex flex-wrap gap-2 text-xs font-mono text-gray-400">
                {ex.sets.map((set: any, sIdx: number) =>
                  set.completed ? (
                    <span key={sIdx} className="bg-gray-800 px-2 py-1 rounded">
                      Set {sIdx + 1}: {set.weight} lbs × {set.reps}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4 border-t border-gray-800 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => toggleLike(post.id, !!isLiked)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}
            >
              <Heart
                className={`w-5 h-5 transition-transform active:scale-75 ${isLiked ? "fill-current" : ""}`}
              />
              {post.likes?.length || 0}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${showComments ? "text-white" : "text-gray-400 hover:text-white"}`}
            >
              <MessageCircle className="w-5 h-5" />
              {post.commentsCount || 0}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStealRoutine}
              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm"
              title="Save as Routine"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className="text-gray-500 hover:text-white transition-colors p-2 -mr-2 rounded-lg hover:bg-gray-800"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showComments && (
          <div className="mt-2 space-y-3">
            {post.comments && post.comments.length > 0 ? (
              <div className="space-y-2 mb-3">
                {post.comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/40 rounded-lg p-3 text-sm flex justify-between items-start gap-4"
                  >
                    <div>
                      <span className="font-bold text-blue-400 block mb-1">
                        {comment.userName}
                      </span>
                      <span className="text-gray-300">{comment.text}</span>
                    </div>
                    {user &&
                      (user.uid === comment.userId ||
                        user.uid === post.userId) && (
                        <button
                          onClick={() => handleDeleteComment(post.id, comment)}
                          className="text-gray-500 hover:text-red-400 transition-colors shrink-0 p-1"
                          title="Delete Comment"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic pb-2">
                No comments yet.
              </p>
            )}

            {user && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg px-3 flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Social() {
  const { user, workoutHistory, settings } = useWorkout();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeTodayQuery = query(
          collection(db, "social_feed"),
          where("timestamp", ">=", twentyFourHoursAgo),
          orderBy("timestamp", "desc"),
        );

        const querySnapshot = await getDocs(activeTodayQuery);
        const activeUsersMap = new Map();

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId && !activeUsersMap.has(data.userId)) {
            activeUsersMap.set(data.userId, {
              id: data.userId,
              userName: data.userName || "Unknown",
              photoURL: data.userPhotoURL || null,
            });
          }
        });

        setActiveUsers(Array.from(activeUsersMap.values()));
      } catch (err) {
        console.error("Failed to fetch active users:", err);
      }
    };

    fetchActiveUsers();
  }, []);

  useEffect(() => {
    // Free tier optimization: limit to 20, don't paginate automatically
    const feedRef = collection(db, "social_feed");
    const q = query(feedRef, orderBy("timestamp", "desc"), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postsData = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        })) as Post[];
        setPosts(postsData);
        setLoading(false);
      },
      (err) => {
        console.warn("Feed error (could be rules/indexes or offline):", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return; // Must be logged in
    try {
      if (isLiked) {
        await updateDoc(doc(db, "social_feed", postId), {
          likes: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(doc(db, "social_feed", postId), {
          likes: arrayUnion(user.uid),
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareSystem = async (workout: Workout) => {
    const volume = workout.exercises.reduce(
      (acc: number, ex: any) =>
        acc +
        ex.sets.reduce(
          (sAcc: number, s: any) =>
            sAcc + (s.completed ? s.weight * s.reps : 0),
          0,
        ),
      0,
    );
    const durationStr = formatDuration(
      workout.endTime ? workout.endTime - workout.startTime : 0,
    );

    const text = `Just crushed a workout: ${workout.name}!\nDuration: ${durationStr}\nTotal Volume: ${volume.toLocaleString()} ${settings.weightUnit}\nPushed my limits today! 💪`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Workout: ${workout.name}`,
          text: text,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      showToast("Workout stats copied to clipboard!");
    }
    setShowShareModal(false);
    setSelectedWorkout(null);
  };

  const handlePostToFeed = async (workout: Workout) => {
    if (!user) {
      alert("Please log in from Settings to post to the feed.");
      return;
    }
    try {
      const volume = workout.exercises.reduce(
        (acc: number, ex: any) =>
          acc +
          ex.sets.reduce(
            (sAcc: number, s: any) =>
              sAcc + (s.completed ? s.weight * s.reps : 0),
            0,
          ),
        0,
      );
      const duration = workout.endTime
        ? workout.endTime - workout.startTime
        : 0;

      await addDoc(collection(db, "social_feed"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous Lifter",
        workoutName: workout.name,
        duration,
        volume,
        exercises: workout.exercises,
        likes: [],
        commentsCount: 0,
        comments: [],
        timestamp: serverTimestamp(),
      });
      showToast("Workout posted to feed!");
      setShowShareModal(false);
      setSelectedWorkout(null);
    } catch (err) {
      console.error(err);
      alert("Failed to post workout.");
    }
  };

  return (
    <div className="pb-32 px-4 animate-in fade-in text-white relative md:max-w-4xl md:mx-auto">
      <PageHeader
        title="Social Feed"
        action={
          <button
            onClick={() => {
              setSelectedWorkout(null);
              setShowShareModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-500 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        }
      />

      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-green-500/20 flex items-center gap-2">
          <Heart className="w-4 h-4 fill-white" />
          {toastMessage}
        </div>
      )}

      {activeUsers.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            Active Today
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-2 border-b border-gray-800 scrollbar-none snap-x">
            {activeUsers.map((activeUser) => (
              <div
                key={activeUser.id}
                className="flex flex-col items-center shrink-0 snap-start"
              >
                <div className="w-14 h-14 rounded-full border-2 border-emerald-500 p-0.5 object-cover flex items-center justify-center bg-gray-800 shadow-lg shadow-emerald-500/20">
                  {activeUser.photoURL ? (
                    <img
                      src={activeUser.photoURL}
                      alt={activeUser.userName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-emerald-400 text-lg">
                      {activeUser.userName?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <span className="text-xs max-w-[64px] truncate text-center text-gray-400 mt-1.5 font-medium">
                  {activeUser.userName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center">
            <MessageCircle className="w-12 h-12 mb-4 text-gray-700" />
            No workouts shared yet. Start lifting and share your progress!
          </div>
        ) : (
          posts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              user={user}
              toggleLike={toggleLike}
              showToast={showToast}
              setPosts={setPosts}
            />
          ))
        )}
      </div>

      {showShareModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-gray-950 sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 shadow-2xl">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                {selectedWorkout ? (
                  <button
                    onClick={() => setSelectedWorkout(null)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white font-medium"
                  >
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>
                ) : (
                  <h2 className="font-bold flex items-center gap-2 text-white">
                    <Share2 className="w-5 h-5 text-blue-400" /> Share Workout
                  </h2>
                )}
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setSelectedWorkout(null);
                  }}
                  className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-900/20">
                {!selectedWorkout ? (
                  <>
                    {workoutHistory.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 block w-full">
                        No workouts to share yet.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Select to share
                        </p>
                        {[...workoutHistory]
                          .sort((a, b) => b.startTime - a.startTime)
                          .map((workout) => (
                            <button
                              key={workout.id}
                              onClick={() =>
                                setSelectedWorkout(workout as Workout)
                              }
                              className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 p-4 rounded-2xl transition-all focus:ring-2 focus:ring-blue-500 outline-none flex justify-between items-center group"
                            >
                              <div>
                                <h3 className="font-bold text-white mb-1">
                                  {workout.name}
                                </h3>
                                <div className="text-xs text-gray-500 font-mono tracking-tight">
                                  {new Date(
                                    workout.startTime,
                                  ).toLocaleDateString()}{" "}
                                  • {workout.exercises.length} Exercises
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ChevronLeft className="w-5 h-5 rotate-180" />
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4 text-center">
                      <h3 className="text-xl font-bold text-white tracking-tight mb-1">
                        {selectedWorkout.name}
                      </h3>
                      <p className="text-sm text-gray-400 font-mono">
                        {new Date(
                          selectedWorkout.startTime,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePostToFeed(selectedWorkout)}
                      className="w-full flex items-center p-4 bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:bg-blue-900/10 rounded-2xl transition-all focus:ring-2 focus:ring-blue-500 outline-none gap-4 group"
                    >
                      <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Send className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="font-bold text-white block">
                          Post to Social Feed
                        </h4>
                        <span className="text-xs text-gray-400">
                          Share with the internal community
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleShareSystem(selectedWorkout)}
                      className="w-full flex items-center p-4 bg-gray-900 border border-gray-800 hover:border-gray-600 hover:bg-gray-800 rounded-2xl transition-all focus:ring-2 focus:ring-gray-400 outline-none gap-4 group"
                    >
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="font-bold text-white block">
                          Share to External Apps
                        </h4>
                        <span className="text-xs text-gray-400">
                          Send to friends via OS Share Sheet
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
