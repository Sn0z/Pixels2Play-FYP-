/**
 * WatchDemo.jsx — Route: /watch/:moduleId
 *
 * Thin shell that renders the full WatchPage component.
 * The moduleId param is consumed internally by WatchPage via useParams().
 */
import React from 'react';
import WatchPage from './WatchPage/WatchPage';

export default function WatchDemo() {
  return <WatchPage />;
}
