import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallbackTitle?: string };

type State = { hasError: boolean; message: string };

export default class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Workout feature error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
          style={{ background: "#0A0A0A" }}
          dir="rtl"
        >
          <p className="text-center text-base font-medium text-white">
            {this.props.fallbackTitle ?? "حدث خطأ في واجهة التمرين"}
          </p>
          <p className="mt-2 text-center text-xs" style={{ color: "#888" }}>
            {this.state.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
