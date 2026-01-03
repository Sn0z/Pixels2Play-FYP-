import React from 'react';
import { useParams } from 'react-router-dom';
import WatchAndQuiz from './WatchAndQuiz/WatchAndQuiz';

export default function WatchDemo() {
  const { moduleId } = useParams();

  // Example: expects module id and module.video_url pointing to a YouTube id
  // You can also pass videoId directly if you store video IDs in Module.video_url
  const videoId = 'dQw4w9WgXcQ'; // placeholder - replace or fetch module details

  return (
    <div style={{ padding: 20 }}>
      <h2>Watch & Quiz Demo (module {moduleId})</h2>
      <WatchAndQuiz videoId={videoId} moduleId={moduleId || 1} />
    </div>
  );
}
