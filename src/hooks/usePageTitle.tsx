import { useEffect } from "react";

const usePageTitle = (title: string) => {
  useEffect(() => {
    document.title = title ? `${title} | fitni` : "fitni - منصة المدرب الشخصي";
    return () => { document.title = "fitni - منصة المدرب الشخصي"; };
  }, [title]);
};

export default usePageTitle;
