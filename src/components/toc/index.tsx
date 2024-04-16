import { Link } from "gatsby";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { TocDiv, TocElementUl, TocIconDiv } from "./style";
import classNames from "classnames";
import { useLocation } from "@reach/router";

export interface TocItem {
  url: string;
  title: string;
  items?: TocItem[];
}
interface TocProps {
  toc?: TocItem;
  anchorHolder: HTMLCollectionOf<Element>;
}

export default function Toc(props: TocProps) {
  const { toc, anchorHolder } = props;
  const { pathname } = useLocation();
  const tocRef = useRef<HTMLDivElement>(null);
  const selectedClass = "selected";

  const scrollHandler = () => {
    const toc = tocRef.current as HTMLCollectionOf<HTMLDivElement> | null;

    if (toc === null) {
      return;
    }
    if (!anchorHolder || anchorHolder.length <= 0) {
      return;
    }

    let selectedAnchor = null;
    const anchorHolderArr = Array.from(anchorHolder);
    for (let a of anchorHolderArr) {
      if (a.getBoundingClientRect().top > -30) {
        selectedAnchor = a.getAttribute("href");
        break;
      }
    }
    if (!selectedAnchor) {
      selectedAnchor =
        anchorHolderArr[anchorHolderArr.length - 1].getAttribute("href");
    }
    tocRef.current?.querySelectorAll(`a.${selectedClass}`).forEach((a) => {
      a.classList.remove(selectedClass);
    });
    if (selectedAnchor) {
      const tocSelected = tocRef.current?.querySelector(
        `a[href='${decodeURIComponent(`${pathname}${selectedAnchor}`)}']`
      );
      tocSelected && tocSelected.classList.add(selectedClass);
    }
  };

  useEffect(() => {
    scrollHandler();
    document.addEventListener("scroll", scrollHandler);
    return () => {
      document.removeEventListener("scroll", scrollHandler);
    };
  });

  return (
    <TocDiv data-component="toc" ref={tocRef}>
      <Toc.TocElement {...props} toc={toc} />
    </TocDiv>
  );
}

interface TocIconRef {
  close: () => void;
  open: () => void;
  toggle: () => void;
}
interface TocIconProps extends TocProps {}
Toc.Icon = forwardRef<TocIconRef, TocIconProps>((props, ref) => {
  const [openState, setOpenState] = useState(false);

  useImperativeHandle(ref, () => ({
    close,
    open,
    toggle,
  }));

  const close = () => setOpenState(false);
  const open = () => setOpenState(true);
  const toggle = () => setOpenState((prev) => !prev);

  return (
    <TocIconDiv data-component="toc-icon">
      {openState ? (
        <div className={classNames("toc-box")}>
          <button className="close-button" onClick={close}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          <Toc {...props} />
        </div>
      ) : (
        <button className="open-button" onClick={open}>
          <i className="fa-solid fa-bars-staggered"></i>
        </button>
      )}
    </TocIconDiv>
  );
});

Toc.TocElement = function (props: TocProps) {
  const { toc } = props;
  return (
    <TocElementUl data-component="toc-element">
      {toc?.items &&
        toc.items.map((item) => (
          <li key={item.title}>
            <Link to={item.url}>{item.title}</Link>
            {item.items && <Toc.TocElement {...props} toc={item} />}
          </li>
        ))}
    </TocElementUl>
  );
};
