import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Shown in Arabic message, e.g. «حسابي» */
  tabLabel?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * Catches render errors inside a mobile shell tab so one bad screen does not blank the whole app.
 */
export class MobileTabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "خطأ غير معروف" };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error("[MobileTabErrorBoundary]", err, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const label = this.props.tabLabel ?? "هذه الشاشة";
      return (
        <div
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center"
          dir="rtl"
        >
          <AlertCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">تعذر فتح {label}</h2>
            <p className="text-sm text-muted-foreground break-words max-w-sm">{this.state.message}</p>
          </div>
          <Button type="button" variant="outline" onClick={this.handleRetry}>
            إعادة المحاولة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
