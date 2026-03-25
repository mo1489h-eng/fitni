import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | CoachBase` : "CoachBase - منصة المدرب الشخصي";
    return () => { document.title = "CoachBase - منصة المدرب الشخصي"; };
  }, [title]);
};

export default usePageTitle;
