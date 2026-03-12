import { useState, useRef, useEffect } from "react";
import { Card, Typography } from "antd";

const { Title } = Typography;

const CustomerHouseView = ({ images = [] }) => {
  const defaultImages = [
    "/images/front.jpeg",
    "/images/left.jpeg",
    "/images/straight.jpeg",
    "/images/right.jpeg",
  ];

  const imageLabels = [
    "Customer Building",
    "Left to the Building",
    "Opposite to the Building",
    "Right to the Building",
  ];

  const imageList = images.length > 0 ? images : defaultImages;

  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(null);
  const startX = useRef(0);
  const dragging = useRef(false);
  const currentIndex = useRef(0);

  const THRESHOLD = 80;
  const containerWidth = 600;

  useEffect(() => {
    imageList.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [imageList]);

  const prevIndex = (index - 1 + imageList.length) % imageList.length;
  const nextIndex = (index + 1) % imageList.length;
  const progress = Math.min(Math.abs(dragOffset) / containerWidth, 1);

  const goToPrev = () => {
    const newIndex = (currentIndex.current - 1 + imageList.length) % imageList.length;
    currentIndex.current = newIndex;
    setIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentIndex.current + 1) % imageList.length;
    currentIndex.current = newIndex;
    setIndex(newIndex);
  };

  const handleStart = (clientX) => {
    dragging.current = true;
    setIsDragging(true);
    startX.current = clientX;
    setDragOffset(0);
  };

  const handleMove = (clientX) => {
    if (!dragging.current) return;
    const diff = clientX - startX.current;
    setDragOffset(diff);

    if (diff > THRESHOLD) {
      goToPrev();
      setDragOffset(0);
      startX.current = clientX;
    } else if (diff < -THRESHOLD) {
      goToNext();
      setDragOffset(0);
      startX.current = clientX;
    }
  };

  const handleEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const getOverlayBtnStyle = (side) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side === "prev" ? "left" : "right"]: "0px",
    zIndex: 10,
    width: "36px",
    height: "72px",
    borderRadius: side === "prev" ? "0 8px 8px 0" : "8px 0 0 8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: hovered === side
      ? "rgba(0, 0, 0, 0.35)"
      : "rgba(0, 0, 0, 0.15)",
    color: "rgba(255, 255, 255, 0.95)",
    boxShadow: "none",
    transition: "background 0.2s ease",
    outline: "none",
    padding: 0,
  });

  return (
    <Card style={{ maxWidth: 660, margin: "0 auto", padding: "16px" }}>

      {/* Dynamic Title */}
      <Title level={4} style={{ textAlign: "center", marginBottom: "20px" }}>
        {imageLabels[index] || `View ${index + 1}`}
      </Title>

      {/* Viewer */}
      <div
        style={styles.viewerWrap}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* Images */}
        {dragOffset > 0 && (
          <img
            src={imageList[prevIndex]}
            alt="Previous"
            draggable={false}
            style={{
              ...styles.img,
              transform: `translateX(${-100 + progress * 100}%)`,
              opacity: progress,
              transition: "none",
            }}
          />
        )}

        <img
          src={imageList[index]}
          alt="House"
          draggable={false}
          style={{
            ...styles.img,
            transform: `translateX(${
              dragOffset > 0
                ? progress * 100
                : dragOffset < 0
                ? -progress * 100
                : 0
            }%)`,
            opacity: 1 - progress * 0.3,
            transition: isDragging
              ? "none"
              : "transform 0.3s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease",
          }}
        />

        {dragOffset < 0 && (
          <img
            src={imageList[nextIndex]}
            alt="Next"
            draggable={false}
            style={{
              ...styles.img,
              transform: `translateX(${100 - progress * 100}%)`,
              opacity: progress,
              transition: "none",
            }}
          />
        )}

        {/* Left overlay button */}
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          onMouseEnter={() => setHovered("prev")}
          onMouseLeave={() => setHovered(null)}
          style={getOverlayBtnStyle("prev")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right overlay button */}
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          onMouseEnter={() => setHovered("next")}
          onMouseLeave={() => setHovered(null)}
          style={getOverlayBtnStyle("next")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </Card>
  );
};

const styles = {
  viewerWrap: {
    position: "relative",
    width: "100%",
    maxWidth: "600px",
    height: "380px",
    margin: "0 auto",
    overflow: "hidden",
    borderRadius: "10px",
    background: "#f0f0f0",
    cursor: "grab",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    userSelect: "none",
  },
  img: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    willChange: "transform",
  },
};

export default CustomerHouseView;