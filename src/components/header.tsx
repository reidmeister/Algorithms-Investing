import { FC } from "react";
import { ThemeTogggle } from "./theme-toggle";

interface HeaderProps {}

const Header: FC<HeaderProps> = ({}) => {
  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">
              <span className="shimmer-text text-3xl font-bold">McMurtrey Investing</span>
            </span>
          </a>
        </div>

        <div className="flex flex-1 items-center space-x-2 justify-between md:justify-end">
          <nav className="flex items-center">
            <ThemeTogggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
