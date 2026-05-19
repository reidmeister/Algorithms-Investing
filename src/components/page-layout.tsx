"use client";
import { FC } from "react";
import Sidebar from "./sidebar";

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="flex-1 w-full">
      <div className="border-b w-full">
        <div className="flex flex-1 items-start min-h-[calc(100vh-154px)] w-full">
          <Sidebar />
          <main className="relative py-6 lg:py-8 flex-1 min-w-0 w-full overflow-x-auto">
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
