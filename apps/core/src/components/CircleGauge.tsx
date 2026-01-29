
type CircleGaugeProps = {
    max: number;
    cur: number;
    size?: number;
    text: string;
    strokeWidth?: number;
    className?: string;
};

export function CircleGauge({
    max,
    cur,
    size = 32,
    strokeWidth = 4,
    className,
    text,
}: CircleGaugeProps) {
    const clampedMax = max <= 0 ? 1 : max;
    const clampedCur = Math.min(Math.max(cur, 0), clampedMax);
    const progress = clampedCur / clampedMax;

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);

    return (
        <div className="relative">
            <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.12)" // adjust to your theme
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                        transition: "stroke-dashoffset 0.2s ease-out",
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium">{text}</span>
            </div>
        </div>
    );
}