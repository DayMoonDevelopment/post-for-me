import { cn } from "~/lib/utils";
import React, { useEffect, useRef } from "react";

interface ParticlesProps {
  className?: string;
}

// Configuration - all localized here
const CONFIG = {
  quantity: 30,
  sizeRange: [24, 36] as [number, number],
  opacityRange: [0.15, 0.5] as [number, number],
  ease: 80,
  staticity: 60,
  velocityRange: 0.05,
  magnetismRange: [0.1, 2] as [number, number],
  globalVelocity: { x: 0.02, y: 0.01 },
};

// Icon generator functions that return properly sized SVG strings
const ICON_GENERATORS = [
  // Social Media
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 21" fill="currentColor"><path d="M17.7153 8.87401C15.9357 8.87401 14.288 8.30857 12.9425 7.34759V14.3332C12.9425 17.8277 10.1082 20.6606 6.61201 20.6606C5.30752 20.6606 4.09504 20.2664 3.08784 19.5904C1.39549 18.4547 0.28125 16.5236 0.28125 14.3332C0.28125 10.8389 3.11561 8.00604 6.61211 8.00611C6.90268 8.00597 7.1929 8.0257 7.4807 8.06502V8.84061L7.4806 11.5646C7.2035 11.4767 6.90816 11.429 6.60172 11.429C5.00229 11.429 3.70594 12.7249 3.70594 14.3233C3.70594 15.4534 4.35394 16.432 5.29887 16.9087C5.69067 17.1062 6.13316 17.2175 6.60174 17.2175C8.1979 17.2175 9.492 15.9269 9.4975 14.3332V0.660614H12.9425V1.1009C12.9546 1.23253 12.9721 1.36366 12.995 1.49393C13.234 2.85698 14.0495 4.02155 15.1813 4.72746C15.9413 5.20164 16.8196 5.45232 17.7154 5.45096L17.7153 8.87401Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 21" fill="currentColor"><path d="M7.58404 20.3666V13.7167H5.52015V10.6606H7.58404V9.34391C7.58404 5.94005 9.124 4.36394 12.464 4.36394C13.0963 4.36394 14.1879 4.48783 14.6363 4.61172V7.38005C14.4001 7.35617 13.9879 7.34394 13.4801 7.34394C11.8401 7.34394 11.2079 7.96394 11.2079 9.58001V10.6606H14.4763L13.9163 13.7162H11.2124V20.5883C16.1637 19.9885 20 15.7726 20 10.6606C20 5.13783 15.5228 0.660614 10 0.660614C4.47722 0.660614 0 5.13783 0 10.6606C0 15.3505 3.22813 19.2859 7.58404 20.3666Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.87234C12.5365 1.87234 12.837 1.88184 13.8389 1.92761C14.4411 1.93488 15.0377 2.0456 15.6024 2.25493C16.0151 2.40723 16.3884 2.65011 16.6949 2.9657C17.0105 3.27217 17.2534 3.64549 17.4057 4.0582C17.615 4.62296 17.7257 5.21949 17.733 5.82175C17.7788 6.82356 17.7883 7.12411 17.7883 9.66061C17.7883 12.1971 17.7788 12.4976 17.733 13.4995C17.7257 14.1017 17.615 14.6983 17.4057 15.263C17.2476 15.6728 17.0055 16.045 16.6949 16.3555C16.3844 16.6661 16.0122 16.9082 15.6024 17.0663C15.0377 17.2756 14.4411 17.3863 13.8389 17.3936C12.837 17.4394 12.5365 17.4489 10 17.4489C7.4635 17.4489 7.16295 17.4394 6.16114 17.3936C5.55859 17.3864 4.96176 17.2757 4.39673 17.0663C3.98433 16.9139 3.61132 16.671 3.30509 16.3555C2.9895 16.049 2.74662 15.6757 2.59432 15.263C2.38499 14.6983 2.27427 14.1017 2.267 13.4995C2.22123 12.4976 2.21173 12.1971 2.21173 9.66061C2.21173 7.12411 2.22123 6.82356 2.267 5.82175C2.27427 5.21949 2.38499 4.62296 2.59432 4.0582C2.74662 3.64549 2.9895 3.27217 3.30509 2.9657C3.61156 2.65011 3.98488 2.40723 4.39759 2.25493C4.96235 2.0456 5.55888 1.93488 6.16114 1.92761C7.16295 1.88184 7.4635 1.87234 10 1.87234ZM10 0.160614C7.42032 0.160614 7.09645 0.171844 6.08341 0.217614C5.29535 0.233334 4.51567 0.382554 3.7775 0.658934C3.1433 0.897714 2.56886 1.27202 2.09427 1.75575C1.61096 2.23017 1.23695 2.8043 0.99832 3.43811C0.72224 4.17633 0.57331 4.95601 0.55786 5.74402C0.51036 6.75706 0.5 7.08093 0.5 9.66061C0.5 12.2403 0.51123 12.5641 0.557 13.5772C0.57272 14.3652 0.72194 15.1449 0.99832 15.8831C1.2371 16.5173 1.61141 17.0917 2.09514 17.5663C2.56956 18.0496 3.14369 18.4236 3.7775 18.6623C4.51572 18.9384 5.2954 19.0873 6.08341 19.1027C7.09645 19.1502 7.42032 19.1606 10 19.1606C12.5797 19.1606 12.9035 19.1494 13.9166 19.1036C14.7046 19.0879 15.4843 18.9387 16.2225 18.6623C16.8538 18.4182 17.4271 18.0449 17.9057 17.5663C18.3843 17.0877 18.7576 16.5144 19.0017 15.8831C19.2778 15.1449 19.4267 14.3652 19.4421 13.5772C19.4896 12.5641 19.5 12.2403 19.5 9.66061C19.5 7.08093 19.4888 6.75706 19.443 5.74402C19.4273 4.95596 19.2781 4.17628 19.0017 3.43811C18.7629 2.80391 18.3886 2.22947 17.9049 1.75488C17.4304 1.27157 16.8563 0.897564 16.2225 0.658934C15.4843 0.382854 14.7046 0.233924 13.9166 0.218474C12.9035 0.170974 12.5797 0.160614 10 0.160614ZM10 4.78193C9.0351 4.78193 8.0918 5.06806 7.28955 5.60413C6.48725 6.14021 5.86194 6.90216 5.49269 7.79361C5.12343 8.68511 5.02682 9.66601 5.21506 10.6124C5.40331 11.5588 5.86796 12.4281 6.55025 13.1103C7.23255 13.7926 8.1018 14.2573 9.0482 14.4455C9.9946 14.6338 10.9755 14.5372 11.867 14.1679C12.7585 13.7987 13.5204 13.1733 14.0565 12.3711C14.5926 11.5688 14.8787 10.6255 14.8787 9.66061C14.8787 8.36671 14.3647 7.12579 13.4497 6.21086C12.5348 5.29593 11.2939 4.78193 10 4.78193ZM10 12.8276C9.3736 12.8276 8.7613 12.6418 8.2405 12.2938C7.71973 11.9458 7.31382 11.4512 7.07412 10.8725C6.83442 10.2939 6.7717 9.65711 6.8939 9.04281C7.0161 8.42841 7.31772 7.86411 7.76063 7.42124C8.2035 6.97833 8.7678 6.67671 9.3822 6.55451C9.9965 6.43231 10.6333 6.49503 11.2119 6.73473C11.7906 6.97443 12.2852 7.38034 12.6332 7.90111C12.9812 8.42191 13.167 9.03421 13.167 9.66061C13.167 10.5005 12.8333 11.3061 12.2394 11.9C11.6455 12.4939 10.8399 12.8276 10 12.8276ZM15.0713 3.44934C14.8458 3.44934 14.6254 3.5162 14.4379 3.64146C14.2505 3.76673 14.1043 3.94477 14.0181 4.15308C13.9318 4.36139 13.9092 4.5906 13.9532 4.81174C13.9972 5.03288 14.1057 5.23601 14.2652 5.39544C14.4246 5.55487 14.6277 5.66345 14.8489 5.70743C15.07 5.75142 15.2992 5.72884 15.5075 5.64256C15.7158 5.55628 15.8939 5.41016 16.0191 5.22269C16.1444 5.03522 16.2113 4.81481 16.2113 4.58934C16.2113 4.28699 16.0912 3.99703 15.8774 3.78324C15.6636 3.56944 15.3736 3.44934 15.0713 3.44934Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 22 18" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2043 0.668374C20.1084 0.948244 20.8189 1.76986 21.0609 2.81536C21.4982 4.70847 21.5 8.66061 21.5 8.66061C21.5 8.66061 21.5 12.6128 21.0609 14.5059C20.8189 15.5514 20.1084 16.373 19.2043 16.6528C17.5673 17.1606 11 17.1606 11 17.1606C11 17.1606 4.43274 17.1606 2.79568 16.6528C1.89159 16.373 1.1811 15.5514 0.93908 14.5059C0.5 12.6128 0.5 8.66061 0.5 8.66061C0.5 8.66061 0.5 4.70847 0.93908 2.81536C1.1811 1.76986 1.89159 0.948244 2.79568 0.668374C4.43274 0.160614 11 0.160614 11 0.160614C11 0.160614 17.5673 0.160614 19.2043 0.668374ZM14.5134 8.66091L8.79785 11.9605V5.36126L14.5134 8.66091Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 18" fill="currentColor"><path d="M15.4033 0.160614H18.2852L11.989 7.36161L19.396 17.1606H13.5964L9.054 11.2176L3.85637 17.1606H0.972692L7.70709 9.45831L0.601562 0.160614H6.54839L10.6544 5.59276L15.4033 0.160614ZM14.3918 15.4344H15.9887L5.68067 1.7961H3.96702L14.3918 15.4344Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 21" fill="currentColor"><path d="M10 0.660614C4.47447 0.660614 0 5.13845 0 10.6681C0 14.9055 2.62763 18.5269 6.35135 19.9844C6.26126 19.188 6.18619 17.9859 6.38138 17.1144C6.56156 16.333 7.55255 12.1407 7.55255 12.1407C7.55255 12.1407 7.25225 11.5396 7.25225 10.6531C7.25225 9.25561 8.0631 8.21884 9.0541 8.21884C9.9099 8.21884 10.3153 8.86501 10.3153 9.63131C10.3153 10.4878 9.7748 11.7801 9.4895 12.9671C9.2492 13.9589 9.985 14.7703 10.976 14.7703C12.7477 14.7703 14.1141 12.892 14.1141 10.1873C14.1141 7.7981 12.3874 6.11516 9.9399 6.11516C7.1021 6.11516 5.42042 8.24889 5.42042 10.4577C5.42042 11.3142 5.75075 12.2459 6.17117 12.7417C6.24625 12.8469 6.26126 12.9221 6.24625 13.0272C6.17117 13.3428 6.00601 14.019 5.97598 14.1542C5.93093 14.3345 5.82583 14.3796 5.64565 14.2894C4.3994 13.7034 3.61862 11.8852 3.61862 10.4127C3.61862 7.25715 5.91592 4.35708 10.2252 4.35708C13.6937 4.35708 16.3814 6.83642 16.3814 10.1272C16.3814 13.5682 14.2042 16.3481 11.2012 16.3481C10.1952 16.3481 9.2342 15.8221 8.9039 15.2061C8.9039 15.2061 8.4084 17.1144 8.2883 17.5802C8.0631 18.4517 7.44745 19.5336 7.04204 20.2098C7.97297 20.4953 8.964 20.6606 10 20.6606C15.5255 20.6606 20 16.1828 20 10.6531C20 5.13845 15.5255 0.660614 10 0.660614Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 19" fill="currentColor"><path d="M16.65 0.660614H1.35C0.99196 0.660614 0.64858 0.802844 0.39541 1.05602C0.14223 1.30919 0 1.65257 0 2.01061V17.3106C0 17.6686 0.14223 18.012 0.39541 18.2652C0.64858 18.5184 0.99196 18.6606 1.35 18.6606H16.65C17.008 18.6606 17.3514 18.5184 17.6046 18.2652C17.8578 18.012 18 17.6686 18 17.3106V2.01061C18 1.65257 17.8578 1.30919 17.6046 1.05602C17.3514 0.802844 17.008 0.660614 16.65 0.660614ZM5.4 15.9606H2.7V7.86061H5.4V15.9606ZM4.05 6.28561C3.74056 6.27677 3.4406 6.17693 3.18758 5.99858C2.93456 5.82023 2.7397 5.57127 2.62737 5.28281C2.51503 4.99435 2.49019 4.67918 2.55595 4.37668C2.6217 4.07419 2.77515 3.79777 2.9971 3.58199C3.21906 3.3662 3.49968 3.2206 3.80391 3.16339C4.10814 3.10617 4.42248 3.13988 4.70766 3.2603C4.99284 3.38071 5.23622 3.5825 5.40737 3.84044C5.57853 4.09839 5.66987 4.40105 5.67 4.71061C5.66289 5.13392 5.4885 5.53721 5.18495 5.83234C4.88139 6.12746 4.47335 6.29043 4.05 6.28561ZM15.3 15.9606H12.6V11.6946C12.6 10.4166 12.06 9.95761 11.358 9.95761C11.1522 9.97131 10.9511 10.0255 10.7663 10.1172C10.5815 10.2088 10.4166 10.3361 10.2811 10.4916C10.1457 10.6472 10.0422 10.828 9.9768 11.0236C9.9114 11.2192 9.8853 11.4258 9.9 11.6316C9.8955 11.6735 9.8955 11.7157 9.9 11.7576V15.9606H7.2V7.86061H9.81V9.03061C10.0733 8.63011 10.435 8.30391 10.8605 8.08331C11.286 7.86271 11.761 7.75501 12.24 7.77061C13.635 7.77061 15.264 8.54461 15.264 11.0646L15.3 15.9606Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 21" fill="currentColor"><path d="M13.9062 9.91201C13.8179 9.86961 13.7283 9.82891 13.6374 9.78991C13.4793 6.87432 11.8868 5.20515 9.2127 5.18807C9.2006 5.188 9.1886 5.188 9.1765 5.188C7.5771 5.188 6.24686 5.87097 5.42813 7.11376L6.89876 8.12297C7.5104 7.19465 8.4703 6.99675 9.1772 6.99675C9.1853 6.99675 9.1935 6.99675 9.2016 6.99682C10.0821 7.00244 10.7465 7.25853 11.1765 7.75794C11.4894 8.12153 11.6987 8.62396 11.8023 9.25801C11.0217 9.12531 10.1775 9.08451 9.275 9.13631C6.73265 9.28281 5.09824 10.7661 5.20801 12.8272C5.26371 13.8727 5.78436 14.7721 6.67398 15.3597C7.4261 15.8564 8.3949 16.0993 9.4017 16.0443C10.7313 15.9714 11.7744 15.4639 12.5021 14.536C13.0547 13.8313 13.4042 12.9181 13.5586 11.7674C14.1922 12.1499 14.6618 12.6534 14.9212 13.2585C15.3622 14.2873 15.3879 15.9778 14.0091 17.356C12.801 18.5634 11.3488 19.0857 9.1542 19.1018C6.71979 19.0838 4.87867 18.3027 3.68162 16.7804C2.56068 15.3549 1.98138 13.2959 1.95976 10.6606C1.98138 8.02527 2.56068 5.96628 3.68162 4.54079C4.87867 3.01848 6.71976 2.23746 9.1542 2.21936C11.6063 2.2376 13.4795 3.02237 14.7223 4.55204C15.3318 5.30217 15.7912 6.24551 16.0941 7.34541L17.8175 6.88543C17.4504 5.53157 16.8726 4.36494 16.0865 3.39742C14.4931 1.43632 12.1628 0.431454 9.1602 0.410614H9.1482C6.15171 0.431374 3.84748 1.44007 2.29949 3.40866C0.922 5.16046 0.21145 7.59796 0.18757 10.6534L0.1875 10.6606L0.18757 10.6678C0.21145 13.7232 0.922 16.1608 2.29949 17.9126C3.84748 19.8811 6.15171 20.8899 9.1482 20.9106H9.1602C11.8242 20.8921 13.702 20.1944 15.2489 18.6482C17.2729 16.6255 17.2119 14.09 16.5449 12.5335C16.0663 11.4173 15.1539 10.5107 13.9062 9.91201ZM9.3065 14.2382C8.1923 14.301 7.0347 13.8006 6.97759 12.729C6.93528 11.9344 7.5428 11.0478 9.3749 10.9421C9.5847 10.93 9.7906 10.9241 9.9928 10.9241C10.6583 10.9241 11.2809 10.9888 11.8468 11.1126C11.6357 13.75 10.3975 14.1783 9.3065 14.2382Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 22 19" fill="currentColor"><path d="M11.0012 9.11412C10.0788 7.19959 7.5657 3.63195 5.22962 1.87217C3.54403 0.602716 0.8125 -0.379854 0.8125 2.74617C0.8125 3.37023 1.1691 7.99082 1.37861 8.74092C2.10583 11.3486 4.75648 12.0137 7.11421 11.6113C2.99288 12.3149 1.94472 14.6456 4.20884 16.9763C8.50879 21.4029 10.3892 15.8657 10.8707 14.4469C10.9598 14.1849 11.0012 14.0633 11.0012 14.1709C11.0012 14.0633 11.0426 14.1849 11.1317 14.4469C11.6132 15.8657 13.4936 21.4029 17.7936 16.9763C20.0577 14.6456 19.0095 12.3149 14.8882 11.6113C17.2459 12.0137 19.8966 11.3486 20.6238 8.74092C20.8333 7.99082 21.1899 3.37023 21.1899 2.74617C21.1899 -0.379854 18.4587 0.602716 16.7728 1.87217C14.4367 3.63195 11.9236 7.19959 11.0012 9.11412Z"/></svg>`,
];

type IconParticle = {
  id: string;
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
  iconIndex: number;
  element: HTMLDivElement;
};

export const SocialMediaLogoParticles: React.FC<ParticlesProps> = ({
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useRef<IconParticle[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const animationId = useRef<number>(null);
  const isInitialized = useRef(false);

  // Mouse tracking with throttling
  useEffect(() => {
    let throttleTimer: number;

    const handleMouseMove = (event: MouseEvent) => {
      if (throttleTimer) return;

      throttleTimer = window.setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const { w, h } = containerSize.current;
          const x = event.clientX - rect.left - w / 2;
          const y = event.clientY - rect.top - h / 2;
          const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
          if (inside) {
            mouse.current.x = x;
            mouse.current.y = y;
          }
        }
        throttleTimer = 0;
      }, 16); // ~60fps throttle
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (throttleTimer) window.clearTimeout(throttleTimer);
    };
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        containerSize.current.w = containerRef.current.offsetWidth;
        containerSize.current.h = containerRef.current.offsetHeight;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Create particle
  const createParticle = (): IconParticle => {
    const [minSize, maxSize] = CONFIG.sizeRange;
    const [minOpacity, maxOpacity] = CONFIG.opacityRange;
    const [minMagnetism, maxMagnetism] = CONFIG.magnetismRange;

    const element = document.createElement("div");
    element.className = "absolute pointer-events-none text-muted-foreground/30";
    element.style.willChange = "transform, opacity";
    element.style.zIndex = "10";

    const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    const iconIndex = Math.floor(Math.random() * ICON_GENERATORS.length);

    element.innerHTML = ICON_GENERATORS[iconIndex](size);

    const particle: IconParticle = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * containerSize.current.w,
      y: Math.random() * containerSize.current.h,
      translateX: 0,
      translateY: 0,
      size,
      alpha: 0.5, // Start with visible alpha for debugging
      targetAlpha: Math.random() * (maxOpacity - minOpacity) + minOpacity,
      dx: (Math.random() - 0.5) * CONFIG.velocityRange,
      dy: (Math.random() - 0.5) * CONFIG.velocityRange,
      magnetism: Math.random() * (maxMagnetism - minMagnetism) + minMagnetism,
      iconIndex,
      element,
    };

    // Set initial position
    const finalX = particle.x + particle.translateX - particle.size / 2;
    const finalY = particle.y + particle.translateY - particle.size / 2;
    element.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
    element.style.opacity = particle.alpha.toString();

    if (containerRef.current) {
      containerRef.current.appendChild(element);
      console.log(
        `Created particle at (${finalX}, ${finalY}) with size ${size}`,
      );
    }

    return particle;
  };

  // Remove particle
  const removeParticle = (particle: IconParticle) => {
    if (particle.element.parentNode) {
      particle.element.parentNode.removeChild(particle.element);
    }
  };

  // Edge fade calculation
  const calculateEdgeFade = (particle: IconParticle): number => {
    const edges = [
      particle.x + particle.translateX - particle.size / 2, // left
      containerSize.current.w -
        (particle.x + particle.translateX + particle.size / 2), // right
      particle.y + particle.translateY - particle.size / 2, // top
      containerSize.current.h -
        (particle.y + particle.translateY + particle.size / 2), // bottom
    ];

    const closestEdge = Math.min(...edges);
    const fadeDistance = 40;

    return Math.max(0, Math.min(1, closestEdge / fadeDistance));
  };

  // Animation loop
  const animate = () => {
    particles.current.forEach((particle, i) => {
      // Edge fade
      const edgeFade = calculateEdgeFade(particle);
      const targetAlpha = particle.targetAlpha * edgeFade;

      // Smooth alpha transition
      particle.alpha += (targetAlpha - particle.alpha) * 0.1;

      // Movement
      particle.x += particle.dx + CONFIG.globalVelocity.x;
      particle.y += particle.dy + CONFIG.globalVelocity.y;

      // Mouse attraction
      const mouseInfluence =
        mouse.current.x / (CONFIG.staticity / particle.magnetism);
      const mouseInfluenceY =
        mouse.current.y / (CONFIG.staticity / particle.magnetism);

      particle.translateX +=
        (mouseInfluence - particle.translateX) / CONFIG.ease;
      particle.translateY +=
        (mouseInfluenceY - particle.translateY) / CONFIG.ease;

      // Apply transforms
      const finalX = particle.x + particle.translateX - particle.size / 2;
      const finalY = particle.y + particle.translateY - particle.size / 2;

      particle.element.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
      particle.element.style.opacity = particle.alpha.toString();

      // Boundary check and respawn
      if (
        particle.x < -particle.size ||
        particle.x > containerSize.current.w + particle.size ||
        particle.y < -particle.size ||
        particle.y > containerSize.current.h + particle.size
      ) {
        removeParticle(particle);
        particles.current[i] = createParticle();
      }
    });

    animationId.current = requestAnimationFrame(animate);
  };

  // Initialize particles
  useEffect(() => {
    const initializeParticles = () => {
      console.log(
        `Container size: ${containerSize.current.w}x${containerSize.current.h}`,
      );
      if (
        containerRef.current &&
        containerSize.current.w > 0 &&
        containerSize.current.h > 0
      ) {
        console.log(`Initializing ${CONFIG.quantity} particles`);
        // Clear any existing particles
        particles.current.forEach(removeParticle);
        particles.current = [];

        // Create new particles
        for (let i = 0; i < CONFIG.quantity; i++) {
          particles.current.push(createParticle());
        }

        // Start animation
        if (animationId.current) {
          cancelAnimationFrame(animationId.current);
        }
        animate();

        isInitialized.current = true;
      } else {
        console.log("Container not ready, retrying...");
        setTimeout(initializeParticles, 100);
      }
    };

    // Wait a frame to ensure container is sized
    const timeoutId = setTimeout(initializeParticles, 100);

    return () => {
      clearTimeout(timeoutId);
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      particles.current.forEach(removeParticle);
      particles.current = [];
      isInitialized.current = false;
    };
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none relative overflow-hidden min-h-screen",
        className,
      )}
      ref={containerRef}
      aria-hidden="true"
    />
  );
};
