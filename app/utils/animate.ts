import gsap from 'gsap';

export function animatePlayPauseButton(isPaused: boolean) {
  const beforeClass = isPaused ? '.play' : '.pause';
  const afterClass = isPaused ? 'pause' : 'play';

  gsap.to(beforeClass, {
    duration: 1,
    css: { className: afterClass },
  });

  gsap.fromTo(
    '#play-pause-button-container',
    { opacity: 1, scale: 0.9 },
    { opacity: 0, scale: 1 }
  );
}
