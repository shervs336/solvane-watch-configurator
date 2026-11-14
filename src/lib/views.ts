// Camera presets, kept separate from the 3D scene so the UI can import them
// without pulling Three.js into the main bundle.

export type ViewId = "hero" | "front" | "profile" | "back" | "dial";

export const VIEWS: { id: ViewId; label: string }[] = [
  { id: "hero", label: "¾ view" },
  { id: "front", label: "Front" },
  { id: "dial", label: "Dial" },
  { id: "profile", label: "Crown" },
  { id: "back", label: "Caseback" },
];

// [camera x, y, z], [target x, y, z]
export const VIEW_POSES: Record<ViewId, [number[], number[]]> = {
  hero: [[9.4, 5, 16.6], [0, 0.35, 0]],
  front: [[0, 0.3, 19], [0, -0.3, 0]],
  dial: [[1.4, 0.9, 8.6], [0, 0, 0.2]],
  profile: [[17, 1.4, 3.2], [0, -0.3, 0]],
  back: [[-4, 2, -17.5], [0, -0.3, 0]],
};

export type SceneApi = {
  setView: (id: ViewId) => void;
  capture: () => string; // PNG data URL of the current view
};
