import type { MuscleGroupId } from "@/store/workout-store";

type MusclePaint = { fill: string; opacity: number; filter?: string };

const EDGE = "rgba(255,255,255,0.2)";
const EDGE_SOFT = "rgba(255,255,255,0.1)";
const STROKE_W = 0.45;
const STROKE_DETAIL = 0.28;

/** Subtle separation lines between muscle bellies (non-interactive). */
function MuscleDetailLines({ paths }: { paths: string[] }) {
  return (
    <g pointerEvents="none" fill="none" stroke={EDGE_SOFT} strokeWidth={STROKE_DETAIL} strokeLinecap="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

function muscleProps(
  id: MuscleGroupId,
  p: (id: MuscleGroupId) => MusclePaint,
  hi: (id: MuscleGroupId) => string | undefined,
  onTap: (id: MuscleGroupId) => void,
  opacityMult = 1
) {
  const pr = p(id);
  return {
    fill: pr.fill,
    opacity: pr.opacity * opacityMult,
    stroke: EDGE_SOFT,
    strokeWidth: STROKE_W,
    filter: hi(id),
    onClick: () => onTap(id),
    className: "cursor-pointer" as const,
  };
}

/**
 * Proportional athletic figure (~1/8 head height), shoulders wider than hips.
 * Front: pecs, delts, biceps, forearms, abs/obliques, quads, calves.
 * Back: traps, lats, rear delts, triceps, erectors, glutes, hams, calves.
 */
export function AnatomicalFrontMuscles({
  paint,
  onTap,
  inflamedId,
}: {
  paint: (id: MuscleGroupId) => MusclePaint;
  onTap: (id: MuscleGroupId) => void;
  inflamedId: string;
}) {
  const p = paint;
  const hi = (id: MuscleGroupId) => (p(id).opacity > 0.52 ? `url(#${inflamedId})` : undefined);

  return (
    <g>
      {/* ——— Pectorals (chest) ——— */}
      <path
        d="M 100 79 C 96 75 88 76 82 82 C 78 86 77 94 79 102 C 81 112 88 120 98 123 C 99 123 100 122 100 121 C 100 122 101 123 102 123 C 112 120 119 112 121 102 C 123 94 122 86 118 82 C 112 76 104 75 100 79 Z"
        {...muscleProps("chest", p, hi, onTap)}
      />
      <path
        d="M 100 84 C 94 82 86 86 84 94 C 83 100 85 108 90 114 C 94 118 98 120 100 118 C 102 120 106 118 110 114 C 115 108 117 100 116 94 C 114 86 106 82 100 84 Z"
        {...muscleProps("chest", p, hi, onTap, 0.88)}
      />
      <path
        d="M 100 92 L 100 118"
        fill="none"
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={0.35}
        pointerEvents="none"
      />

      {/* ——— Deltoids ——— */}
      <path
        d="M 82 78 C 74 74 66 78 62 86 C 59 92 60 102 64 112 C 66 116 70 119 74 118 C 78 110 80 100 82 92 C 83 86 83 81 82 78 Z"
        {...muscleProps("shoulders", p, hi, onTap)}
      />
      <path
        d="M 118 78 C 126 74 134 78 138 86 C 141 92 140 102 136 112 C 134 116 130 119 126 118 C 122 110 120 100 118 92 C 117 86 117 81 118 78 Z"
        {...muscleProps("shoulders", p, hi, onTap)}
      />
      <path
        d="M 74 84 C 70 82 66 84 64 90"
        fill="none"
        stroke={EDGE}
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />
      <path
        d="M 126 84 C 130 82 134 84 136 90"
        fill="none"
        stroke={EDGE}
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Biceps ——— */}
      <path
        d="M 64 94 C 58 104 54 120 56 136 C 57 146 62 154 70 156 C 74 148 76 136 76 124 C 76 112 72 102 66 96 Z"
        {...muscleProps("arms", p, hi, onTap)}
      />
      <path
        d="M 136 94 C 142 104 146 120 144 136 C 143 146 138 154 130 156 C 126 148 124 136 124 124 C 124 112 128 102 134 96 Z"
        {...muscleProps("arms", p, hi, onTap)}
      />
      {/* Forearms */}
      <path
        d="M 70 156 C 66 168 62 186 64 204 C 65 214 68 222 74 226 C 78 218 80 206 80 194 C 80 182 78 170 74 160 Z"
        {...muscleProps("arms", p, hi, onTap, 0.95)}
      />
      <path
        d="M 130 156 C 134 168 138 186 136 204 C 135 214 132 222 126 226 C 122 218 120 206 120 194 C 120 182 122 170 126 160 Z"
        {...muscleProps("arms", p, hi, onTap, 0.95)}
      />
      <path
        d="M 68 200 C 66 214 66 230 70 242"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />
      <path
        d="M 132 200 C 134 214 134 230 130 242"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Obliques (core) ——— */}
      <path
        d="M 84 124 C 80 128 78 138 79 148 C 80 158 84 166 90 170 C 92 162 93 152 92 142 C 91 134 88 128 84 124 Z"
        {...muscleProps("core", p, hi, onTap, 0.92)}
      />
      <path
        d="M 116 124 C 120 128 122 138 121 148 C 120 158 116 166 110 170 C 108 162 107 152 108 142 C 109 134 112 128 116 124 Z"
        {...muscleProps("core", p, hi, onTap, 0.92)}
      />
      {/* Rectus abdominis — 6-pack segments */}
      <path
        d="M 100 122 C 94 122 88 126 87 132 C 86 138 88 144 92 148 C 96 150 100 149 100 145 C 100 149 104 150 108 148 C 112 144 114 138 113 132 C 112 126 106 122 100 122 Z"
        {...muscleProps("core", p, hi, onTap)}
      />
      <path
        d="M 100 148 C 94 149 89 154 88 160 C 87 166 90 172 95 175 C 98 176 100 175 100 172 C 100 175 102 176 105 175 C 110 172 113 166 112 160 C 111 154 106 149 100 148 Z"
        {...muscleProps("core", p, hi, onTap, 0.97)}
      />
      <path
        d="M 100 174 C 95 175 91 180 90 186 C 89 192 92 198 97 200 C 99 201 100 200 100 198 C 100 200 101 201 103 200 C 108 198 111 192 110 186 C 109 180 105 175 100 174 Z"
        {...muscleProps("core", p, hi, onTap, 0.94)}
      />
      <MuscleDetailLines
        paths={["M 100 122 L 100 200", "M 92 132 Q 96 135 100 134 Q 104 135 108 132", "M 91 158 Q 96 161 100 160 Q 104 161 109 158"]}
      />

      {/* ——— Quadriceps ——— */}
      <path
        d="M 88 198 C 82 204 78 218 78 236 C 78 256 82 276 88 290 C 90 282 92 268 92 254 C 92 234 90 214 88 198 Z"
        {...muscleProps("legs", p, hi, onTap)}
      />
      <path
        d="M 112 198 C 118 204 122 218 122 236 C 122 256 118 276 112 290 C 110 282 108 268 108 254 C 108 234 110 214 112 198 Z"
        {...muscleProps("legs", p, hi, onTap)}
      />
      <path
        d="M 100 198 C 96 200 94 210 94 222 C 94 242 96 262 100 278 C 104 262 106 242 106 222 C 106 210 104 200 100 198 Z"
        {...muscleProps("legs", p, hi, onTap, 0.9)}
      />
      {/* Vastus medialis / teardrop */}
      <path
        d="M 86 258 L 82 288 L 90 294 L 94 268 Z"
        {...muscleProps("legs", p, hi, onTap, 0.88)}
      />
      <path
        d="M 114 258 L 118 288 L 110 294 L 106 268 Z"
        {...muscleProps("legs", p, hi, onTap, 0.88)}
      />
      <path
        d="M 94 240 L 92 272 L 98 276 L 100 246 Z M 106 240 L 108 272 L 102 276 L 100 246 Z"
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Calves ——— */}
      <path
        d="M 88 292 C 84 302 82 318 84 334 C 86 348 90 356 96 358 C 98 348 98 332 96 316 C 94 304 91 296 88 292 Z"
        {...muscleProps("legs", p, hi, onTap, 0.93)}
      />
      <path
        d="M 112 292 C 116 302 118 318 116 334 C 114 348 110 356 104 358 C 102 348 102 332 104 316 C 106 304 109 296 112 292 Z"
        {...muscleProps("legs", p, hi, onTap, 0.93)}
      />
      <path
        d="M 100 288 C 98 300 98 320 100 338 C 102 320 102 300 100 288 Z"
        {...muscleProps("legs", p, hi, onTap, 0.85)}
      />
    </g>
  );
}

export function AnatomicalBackMuscles({
  paint,
  onTap,
  inflamedId,
}: {
  paint: (id: MuscleGroupId) => MusclePaint;
  onTap: (id: MuscleGroupId) => void;
  inflamedId: string;
}) {
  const p = paint;
  const hi = (id: MuscleGroupId) => (p(id).opacity > 0.52 ? `url(#${inflamedId})` : undefined);

  return (
    <g>
      {/* ——— Trapezius ——— */}
      <path
        d="M 100 62 C 90 64 82 70 78 78 C 76 82 77 88 80 92 C 84 88 90 84 96 82 C 98 81 100 80 100 80 C 100 80 102 81 104 82 C 110 84 116 88 120 92 C 123 88 124 82 122 78 C 118 70 110 64 100 62 Z"
        {...muscleProps("back", p, hi, onTap)}
      />
      <path
        d="M 100 80 C 94 82 88 86 86 92 C 84 98 86 104 90 108 C 94 104 98 100 100 96 C 102 100 106 104 110 108 C 114 104 116 98 114 92 C 112 86 106 82 100 80 Z"
        {...muscleProps("back", p, hi, onTap, 0.92)}
      />

      {/* ——— Rhomboid / mid-thoracic ——— */}
      <path
        d="M 100 96 C 94 98 90 104 88 112 C 92 116 96 118 100 116 C 104 118 108 116 112 112 C 110 104 106 98 100 96 Z"
        {...muscleProps("back", p, hi, onTap, 0.88)}
      />

      {/* ——— Latissimus dorsi ——— */}
      <path
        d="M 86 108 C 78 118 74 138 78 158 C 80 170 86 180 94 184 C 96 176 98 164 98 152 C 98 138 94 124 88 114 Z"
        {...muscleProps("back", p, hi, onTap)}
      />
      <path
        d="M 114 108 C 122 118 126 138 122 158 C 120 170 114 180 106 184 C 104 176 102 164 102 152 C 102 138 106 124 112 114 Z"
        {...muscleProps("back", p, hi, onTap)}
      />
      <path
        d="M 100 118 C 98 130 98 148 100 162 C 102 148 102 130 100 118 Z"
        {...muscleProps("back", p, hi, onTap, 0.82)}
      />

      {/* ——— Rear deltoids ——— */}
      <path
        d="M 78 76 C 72 72 66 74 62 80 C 60 84 60 90 62 96 C 66 92 72 88 76 86 C 77 82 78 78 78 76 Z"
        {...muscleProps("shoulders", p, hi, onTap)}
      />
      <path
        d="M 122 76 C 128 72 134 74 138 80 C 140 84 140 90 138 96 C 134 92 128 88 124 86 C 123 82 122 78 122 76 Z"
        {...muscleProps("shoulders", p, hi, onTap)}
      />

      {/* ——— Triceps ——— */}
      <path
        d="M 60 92 C 54 108 50 128 52 148 C 54 158 58 166 66 168 C 68 158 70 144 70 130 C 70 116 66 102 62 94 Z"
        {...muscleProps("arms", p, hi, onTap)}
      />
      <path
        d="M 140 92 C 146 108 150 128 148 148 C 146 158 142 166 134 168 C 132 158 130 144 130 130 C 130 116 134 102 138 94 Z"
        {...muscleProps("arms", p, hi, onTap)}
      />
      {/* Forearms (extensors) */}
      <path
        d="M 66 168 C 62 182 58 202 60 220 C 61 228 64 234 70 236 C 74 226 76 212 76 198 C 76 186 72 176 68 170 Z"
        {...muscleProps("arms", p, hi, onTap, 0.94)}
      />
      <path
        d="M 134 168 C 138 182 142 202 140 220 C 139 228 136 234 130 236 C 126 226 124 212 124 198 C 124 186 128 176 132 170 Z"
        {...muscleProps("arms", p, hi, onTap, 0.94)}
      />
      <path
        d="M 64 198 L 62 228 M 136 198 L 138 228"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Erector spinae / lumbar ——— */}
      <path
        d="M 100 164 C 94 166 88 172 86 180 C 84 188 88 196 94 200 C 96 196 98 190 100 186 C 102 190 104 196 106 200 C 112 196 116 188 114 180 C 112 172 106 166 100 164 Z"
        {...muscleProps("core", p, hi, onTap)}
      />
      <path
        d="M 100 186 L 100 204"
        fill="none"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Gluteus maximus ——— */}
      <path
        d="M 88 198 C 82 204 80 214 82 224 C 84 234 92 240 100 238 C 108 240 116 234 118 224 C 120 214 118 204 112 198 C 108 194 104 192 100 194 C 96 192 92 194 88 198 Z"
        {...muscleProps("legs", p, hi, onTap)}
      />
      <path
        d="M 100 220 C 98 228 98 232 100 236 C 102 232 102 228 100 220 Z"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Hamstrings ——— */}
      <path
        d="M 86 236 C 80 248 78 268 80 288 C 82 298 86 304 92 306 C 94 296 96 282 96 268 C 96 254 92 242 88 234 Z"
        {...muscleProps("legs", p, hi, onTap)}
      />
      <path
        d="M 114 236 C 120 248 122 268 120 288 C 118 298 114 304 108 306 C 106 296 104 282 104 268 C 104 254 108 242 112 234 Z"
        {...muscleProps("legs", p, hi, onTap)}
      />
      <path
        d="M 100 238 C 98 252 98 272 100 290 C 102 272 102 252 100 238 Z"
        {...muscleProps("legs", p, hi, onTap, 0.86)}
      />
      <path
        d="M 94 260 L 92 296 M 106 260 L 108 296"
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={STROKE_DETAIL}
        pointerEvents="none"
      />

      {/* ——— Calves ——— */}
      <path
        d="M 88 300 C 84 312 82 330 86 346 C 88 354 94 360 100 356 C 94 340 92 322 90 306 Z"
        {...muscleProps("legs", p, hi, onTap, 0.92)}
      />
      <path
        d="M 112 300 C 116 312 118 330 114 346 C 112 354 106 360 100 356 C 106 340 108 322 110 306 Z"
        {...muscleProps("legs", p, hi, onTap, 0.92)}
      />
      <path
        d="M 100 292 C 98 310 98 332 100 352 C 102 332 102 310 100 292 Z"
        {...muscleProps("legs", p, hi, onTap, 0.84)}
      />
    </g>
  );
}

/** Realistic outer silhouette: head ~1/8 height, shoulders wider than hips, tapered waist. */
export function AnatomicalBodyOutline({ side }: { side: "front" | "back" }) {
  const headH = 50;
  const yNeck = 56;
  const yShoulder = 74;
  const yWaist = 176;
  const yHip = 204;
  const yKnee = 272;
  const yAnkle = 348;

  return (
    <g pointerEvents="none" fill="none" stroke={EDGE} strokeWidth={0.55} strokeLinejoin="round" opacity={0.95}>
      {/* Head — ellipse height ≈ 1/8 of ~400 unit figure */}
      <ellipse cx={100} cy={headH / 2 + 4} rx={15.5} ry={19} fill="rgba(8,8,8,0.5)" stroke={EDGE} strokeWidth={0.5} />

      {/* Neck */}
      <path
        d={
          side === "front"
            ? `M 94 ${yNeck} Q 100 ${yNeck - 4} 106 ${yNeck} L 108 ${yNeck + 14} L 92 ${yNeck + 14} Z`
            : `M 94 ${yNeck} Q 100 ${yNeck - 4} 106 ${yNeck} L 107 ${yNeck + 14} L 93 ${yNeck + 14} Z`
        }
        fill="rgba(10,10,10,0.35)"
        stroke={EDGE_SOFT}
        strokeWidth={0.4}
      />

      {/* Clavicle hint */}
      <path
        d={`M 72 ${yShoulder - 2} Q 100 ${yShoulder - 8} 128 ${yShoulder - 2}`}
        stroke={EDGE_SOFT}
        strokeWidth={0.35}
        fill="none"
      />

      {/* Full body contour — shoulders wide, waist narrow, hips medium */}
      <path
        d={[
          `M 100 ${yNeck + 14}`,
          `C 118 ${yShoulder - 6} 132 ${yShoulder + 8} 136 ${yShoulder + 28}`,
          `C 138 ${yShoulder + 48} 132 ${yShoulder + 72} 128 ${yShoulder + 96}`,
          `C 124 ${130} 118 ${yWaist - 20} 114 ${yWaist}`,
          `C 112 ${yHip - 8} 110 ${yHip} 108 ${yHip + 12}`,
          `C 106 ${yKnee - 8} 104 ${yKnee} 102 ${yAnkle}`,
          `C 101 ${yAnkle + 18} 100 ${yAnkle + 36} 100 382`,
          `C 100 ${yAnkle + 36} 99 ${yAnkle + 18} 98 ${yAnkle}`,
          `C 96 ${yKnee} 94 ${yKnee - 8} 92 ${yHip + 12}`,
          `C 90 ${yHip} 88 ${yHip - 8} 86 ${yWaist}`,
          `C 82 ${yWaist - 20} 76 ${130} 72 ${yShoulder + 96}`,
          `C 68 ${yShoulder + 72} 62 ${yShoulder + 48} 64 ${yShoulder + 28}`,
          `C 68 ${yShoulder + 8} 82 ${yShoulder - 6} 100 ${yNeck + 14}`,
          `Z`,
        ].join(" ")}
      />

      {/* Spine line (back) */}
      {side === "back" && (
        <path
          d={`M 100 ${yNeck + 16} L 100 200`}
          stroke={EDGE_SOFT}
          strokeWidth={0.32}
          strokeDasharray="2 3"
          opacity={0.85}
        />
      )}
    </g>
  );
}
