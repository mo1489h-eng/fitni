export interface AdminPageProps {
  data: any;
  loading: boolean;
  month: string;
  onMonthChange: (m: string) => void;
  onAction: (action: string, payload?: Record<string, any>) => Promise<any>;
  onRefresh: () => void;
}
