import { useRef, useCallback } from 'react';

interface BufferedStreamingOptions {
  /** Minimum buffer size before starting to display (characters) */
  minBufferSize?: number;
  /** Characters to display per frame */
  charsPerFrame?: number;
  /** Target frame interval in ms (lower = faster) */
  frameInterval?: number;
}

export const useBufferedStreaming = (options: BufferedStreamingOptions = {}) => {
  const {
    minBufferSize = 10,   // Start quickly - only buffer 10 chars
    charsPerFrame = 2,    // Slower display for smoother effect
    frameInterval = 20,   // Slightly slower frame rate
  } = options;

  const bufferRef = useRef('');
  const displayedRef = useRef('');
  const isStreamingRef = useRef(false);
  const isCompleteRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const hasStartedRef = useRef(false);

  const startDisplayLoop = useCallback((onUpdate: (content: string) => void) => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    const displayLoop = (timestamp: number) => {
      // Throttle to target frame interval
      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(displayLoop);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      const buffer = bufferRef.current;
      const displayed = displayedRef.current;
      
      // Calculate how much we can display
      const remaining = buffer.length - displayed.length;
      
      if (remaining > 0) {
        // Display more characters
        const toDisplay = Math.min(charsPerFrame, remaining);
        displayedRef.current = buffer.slice(0, displayed.length + toDisplay);
        onUpdate(displayedRef.current);
      }
      
      // Continue loop if still streaming or have content to display
      if (!isCompleteRef.current || displayedRef.current.length < bufferRef.current.length) {
        animationFrameRef.current = requestAnimationFrame(displayLoop);
      } else {
        // Final update with complete content
        displayedRef.current = bufferRef.current;
        onUpdate(displayedRef.current);
      }
    };

    animationFrameRef.current = requestAnimationFrame(displayLoop);
  }, [charsPerFrame, frameInterval]);

  const addChunk = useCallback((chunk: string, onUpdate: (content: string) => void) => {
    bufferRef.current += chunk;
    
    // Start display loop once we have any content
    if (!isStreamingRef.current) {
      isStreamingRef.current = true;
      
      // Start immediately if we have enough, or after a tiny delay
      if (bufferRef.current.length >= minBufferSize) {
        startDisplayLoop(onUpdate);
      } else {
        // Small timeout to accumulate a bit more
        setTimeout(() => {
          if (!hasStartedRef.current && bufferRef.current.length > 0) {
            startDisplayLoop(onUpdate);
          }
        }, 50);
      }
    }
  }, [minBufferSize, startDisplayLoop]);

  const complete = useCallback((onUpdate: (content: string) => void) => {
    isCompleteRef.current = true;
    
    // If streaming hasn't started yet, display everything immediately
    if (!hasStartedRef.current && bufferRef.current.length > 0) {
      displayedRef.current = bufferRef.current;
      onUpdate(displayedRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    bufferRef.current = '';
    displayedRef.current = '';
    isStreamingRef.current = false;
    isCompleteRef.current = false;
    hasStartedRef.current = false;
    lastFrameTimeRef.current = 0;
  }, []);

  const getFullContent = useCallback(() => {
    return bufferRef.current;
  }, []);

  const getDisplayedContent = useCallback(() => {
    return displayedRef.current;
  }, []);

  return {
    addChunk,
    complete,
    reset,
    getFullContent,
    getDisplayedContent,
  };
};
