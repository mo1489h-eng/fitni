import type { MuscleGroupId } from "@/store/workout-store";

type MusclePaint = { fill: string; opacity: number; filter?: string };

/** Stylized anatomical muscle regions — front & back. Glutes share `legs` heat. */
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
      {/* Pectorals */}
      <path
        d="M 100 78 C 94 72 78 76 70 86 C 66 92 68 102 72 112 C 78 124 92 128 100 120 C 108 128 122 124 128 112 C 132 102 134 92 130 86 C 122 76 106 72 100 78 Z"
        {...p("chest")}
        filter={hi("chest")}
        onClick={() => onTap("chest")}
        className="cursor-pointer"
      />
      <path
        d="M 100 88 L 100 118"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={0.6}
        fill="none"
        pointerEvents="none"
      />
      {/* Deltoids */}
      <path
        d="M 70 84 C 62 78 54 82 50 94 C 48 104 52 118 58 128 L 68 122 C 64 110 62 98 66 90 Z"
        {...p("shoulders")}
        filter={hi("shoulders")}
        onClick={() => onTap("shoulders")}
        className="cursor-pointer"
      />
      <path
        d="M 130 84 C 138 78 146 82 150 94 C 152 104 148 118 142 128 L 132 122 C 136 110 138 98 134 90 Z"
        {...p("shoulders")}
        filter={hi("shoulders")}
        onClick={() => onTap("shoulders")}
        className="cursor-pointer"
      />
      {/* Arms — biceps / anterior chain */}
      <path
        d="M 52 96 C 44 108 40 128 42 148 C 44 162 50 172 58 176 L 64 168 C 58 158 54 142 56 128 C 58 114 62 104 68 98 Z"
        {...p("arms")}
        filter={hi("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 148 96 C 156 108 160 128 158 148 C 156 162 150 172 142 176 L 136 168 C 142 158 146 142 144 128 C 142 114 138 104 132 98 Z"
        {...p("arms")}
        filter={hi("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 58 176 L 52 210 L 60 218 L 68 182 Z M 142 176 L 148 210 L 140 218 L 132 182 Z"
        {...p("arms")}
        opacity={p("arms").opacity * 0.92}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      {/* Core — rectus + upper serratus hint */}
      <path
        d="M 100 118 C 92 118 84 122 80 130 L 82 168 C 86 182 92 188 100 190 C 108 188 114 182 118 168 L 120 130 C 116 122 108 118 100 118 Z"
        {...p("core")}
        filter={hi("core")}
        onClick={() => onTap("core")}
        className="cursor-pointer"
      />
      <path
        d="M 88 132 L 88 164 M 100 124 L 100 178 M 112 132 L 112 164"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={0.45}
        fill="none"
        pointerEvents="none"
      />
      {/* Quads */}
      <path
        d="M 82 188 C 76 198 72 220 74 248 C 76 278 80 298 88 308 L 96 302 C 90 288 86 262 84 238 C 82 218 84 202 88 192 Z"
        {...p("legs")}
        filter={hi("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 118 188 C 124 198 128 220 126 248 C 124 278 120 298 112 308 L 104 302 C 110 288 114 262 116 238 C 118 218 116 202 112 192 Z"
        {...p("legs")}
        filter={hi("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      {/* Vastus medialis accents */}
      <path
        d="M 88 248 L 84 292 L 92 298 L 96 256 Z M 112 248 L 116 292 L 108 298 L 104 256 Z"
        {...p("legs")}
        opacity={p("legs").opacity * 0.88}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      {/* Calves */}
      <path
        d="M 86 302 C 82 318 80 338 84 352 C 86 362 90 368 96 370 L 100 364 C 96 348 94 328 92 310 Z"
        {...p("legs")}
        opacity={p("legs").opacity * 0.95}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 114 302 C 118 318 120 338 116 352 C 114 362 110 368 104 370 L 100 364 C 104 348 106 328 108 310 Z"
        {...p("legs")}
        opacity={p("legs").opacity * 0.95}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
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
      {/* Trapezius / upper back */}
      <path
        d="M 100 64 C 88 68 78 76 74 88 L 78 102 C 84 96 92 92 100 90 C 108 92 116 96 122 102 L 126 88 C 122 76 112 68 100 64 Z"
        {...p("back")}
        filter={hi("back")}
        onClick={() => onTap("back")}
        className="cursor-pointer"
      />
      {/* Latissimus */}
      <path
        d="M 76 100 C 68 112 64 138 70 162 C 74 176 82 184 92 186 L 96 170 C 88 158 84 138 86 120 Z"
        {...p("back")}
        filter={hi("back")}
        onClick={() => onTap("back")}
        className="cursor-pointer"
      />
      <path
        d="M 124 100 C 132 112 136 138 130 162 C 126 176 118 184 108 186 L 104 170 C 112 158 116 138 114 120 Z"
        {...p("back")}
        filter={hi("back")}
        onClick={() => onTap("back")}
        className="cursor-pointer"
      />
      <path
        d="M 92 120 C 96 150 98 170 100 178 C 102 170 104 150 108 120 C 106 118 102 116 100 116 C 98 116 94 118 92 120 Z"
        {...p("back")}
        opacity={p("back").opacity * 0.9}
        onClick={() => onTap("back")}
        className="cursor-pointer"
      />
      {/* Rear delts */}
      <path
        d="M 72 82 L 58 76 L 52 96 L 62 112 L 70 108 Z"
        {...p("shoulders")}
        filter={hi("shoulders")}
        onClick={() => onTap("shoulders")}
        className="cursor-pointer"
      />
      <path
        d="M 128 82 L 142 76 L 148 96 L 138 112 L 130 108 Z"
        {...p("shoulders")}
        filter={hi("shoulders")}
        onClick={() => onTap("shoulders")}
        className="cursor-pointer"
      />
      {/* Triceps / posterior arms */}
      <path
        d="M 50 98 C 42 118 38 148 44 168 C 48 178 54 184 62 182 L 66 170 C 60 152 58 128 62 108 Z"
        {...p("arms")}
        filter={hi("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 150 98 C 158 118 162 148 156 168 C 152 178 146 184 138 182 L 134 170 C 140 152 142 128 138 108 Z"
        {...p("arms")}
        filter={hi("arms")}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      <path
        d="M 58 182 L 54 218 L 62 224 L 68 188 Z M 142 182 L 146 218 L 138 224 L 132 188 Z"
        {...p("arms")}
        opacity={p("arms").opacity * 0.9}
        onClick={() => onTap("arms")}
        className="cursor-pointer"
      />
      {/* Erectors / lower back — core */}
      <path
        d="M 100 178 C 94 180 88 186 86 196 L 88 212 C 92 206 96 202 100 200 C 104 202 108 206 112 212 L 114 196 C 112 186 106 180 100 178 Z"
        {...p("core")}
        filter={hi("core")}
        onClick={() => onTap("core")}
        className="cursor-pointer"
      />
      {/* Glutes */}
      <path
        d="M 86 200 C 78 208 76 222 80 234 C 84 244 92 248 100 246 C 108 248 116 244 120 234 C 124 222 122 208 114 200 C 110 196 104 194 100 196 C 96 194 90 196 86 200 Z"
        {...p("legs")}
        filter={hi("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      {/* Hamstrings */}
      <path
        d="M 82 244 C 78 260 76 288 80 308 L 90 312 C 86 292 86 268 88 252 Z"
        {...p("legs")}
        filter={hi("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 118 244 C 122 260 124 288 120 308 L 110 312 C 114 292 114 268 112 252 Z"
        {...p("legs")}
        filter={hi("legs")}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      <path
        d="M 96 248 L 94 302 L 102 306 L 104 252 Z M 104 248 L 106 302 L 98 306 L 96 252 Z"
        {...p("legs")}
        opacity={p("legs").opacity * 0.88}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
      {/* Calves */}
      <path
        d="M 88 310 C 84 328 82 348 86 362 C 88 368 94 372 100 368 C 106 372 112 368 114 362 C 118 348 116 328 112 310 C 108 304 104 302 100 304 C 96 302 92 304 88 310 Z"
        {...p("legs")}
        opacity={p("legs").opacity * 0.95}
        onClick={() => onTap("legs")}
        className="cursor-pointer"
      />
    </g>
  );
}

export function AnatomicalBodyOutline({ side }: { side: "front" | "back" }) {
  if (side === "front") {
    return (
      <g pointerEvents="none" opacity={0.9}>
        <ellipse cx={100} cy={34} rx={19} ry={23} fill="#121212" stroke="#252525" strokeWidth={0.8} />
        <path
          d="M 100 56 L 108 56 L 118 66 L 128 88 L 132 118 L 130 175 L 126 245 L 122 315 L 118 368 L 108 372 L 100 368 L 92 372 L 82 368 L 78 315 L 74 245 L 70 175 L 68 118 L 72 88 L 82 66 L 92 56 Z"
          fill="none"
          stroke="#1e1e1e"
          strokeWidth={1.2}
          opacity={0.85}
        />
      </g>
    );
  }
  return (
    <g pointerEvents="none" opacity={0.9}>
      <ellipse cx={100} cy={34} rx={19} ry={23} fill="#121212" stroke="#252525" strokeWidth={0.8} />
      <path
        d="M 100 56 L 108 56 L 118 66 L 128 88 L 132 118 L 130 175 L 126 245 L 122 315 L 118 368 L 108 372 L 100 368 L 92 372 L 82 368 L 78 315 L 74 245 L 70 175 L 68 118 L 72 88 L 82 66 L 92 56 Z"
        fill="none"
        stroke="#1e1e1e"
        strokeWidth={1.2}
        opacity={0.85}
      />
    </g>
  );
}
