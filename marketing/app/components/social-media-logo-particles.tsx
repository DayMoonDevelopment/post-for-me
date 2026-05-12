import React, { useEffect, useRef } from "react";

import { cn } from "~/lib/utils";

interface ParticlesProps {
  className?: string;
}

// Configuration - all localized here
const CONFIG = {
  quantity: 30,
  sizeRange: [24, 36] as [number, number],
  opacityRange: [1, 1] as [number, number],
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
    `<svg width="${size}" height="${size}" viewBox="0 0 18 21" fill="black"><path d="M17.7153 8.87401C15.9357 8.87401 14.288 8.30857 12.9425 7.34759V14.3332C12.9425 17.8277 10.1082 20.6606 6.61201 20.6606C5.30752 20.6606 4.09504 20.2664 3.08784 19.5904C1.39549 18.4547 0.28125 16.5236 0.28125 14.3332C0.28125 10.8389 3.11561 8.00604 6.61211 8.00611C6.90268 8.00597 7.1929 8.0257 7.4807 8.06502V8.84061L7.4806 11.5646C7.2035 11.4767 6.90816 11.429 6.60172 11.429C5.00229 11.429 3.70594 12.7249 3.70594 14.3233C3.70594 15.4534 4.35394 16.432 5.29887 16.9087C5.69067 17.1062 6.13316 17.2175 6.60174 17.2175C8.1979 17.2175 9.492 15.9269 9.4975 14.3332V0.660614H12.9425V1.1009C12.9546 1.23253 12.9721 1.36366 12.995 1.49393C13.234 2.85698 14.0495 4.02155 15.1813 4.72746C15.9413 5.20164 16.8196 5.45232 17.7154 5.45096L17.7153 8.87401Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 21" fill="#0866FF"><path d="M7.58404 20.3666V13.7167H5.52015V10.6606H7.58404V9.34391C7.58404 5.94005 9.124 4.36394 12.464 4.36394C13.0963 4.36394 14.1879 4.48783 14.6363 4.61172V7.38005C14.4001 7.35617 13.9879 7.34394 13.4801 7.34394C11.8401 7.34394 11.2079 7.96394 11.2079 9.58001V10.6606H14.4763L13.9163 13.7162H11.2124V20.5883C16.1637 19.9885 20 15.7726 20 10.6606C20 5.13783 15.5228 0.660614 10 0.660614C4.47722 0.660614 0 5.13783 0 10.6606C0 15.3505 3.22813 19.2859 7.58404 20.3666Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_205_130)">
    <path d="M21.507 0C12.5309 0 9.90578 0.00926348 9.3955 0.0515999C7.55347 0.204758 6.40725 0.494873 5.15848 1.11675C4.19613 1.59477 3.43715 2.14885 2.6881 2.92557C1.32394 4.34204 0.49717 6.08467 0.197874 8.15613C0.0523698 9.16176 0.0100331 9.36684 0.00143577 14.5035C-0.00186338 16.2157 0.00143577 18.4691 0.00143577 21.4916C0.00143577 30.4628 0.0113494 33.086 0.0543521 33.5954C0.203171 35.3884 0.484265 36.5164 1.07954 37.7503C2.21718 40.1121 4.38991 41.8852 6.94959 42.5468C7.83589 42.7751 8.81478 42.9008 10.0715 42.9603C10.6039 42.9835 16.0308 43 21.461 43C26.8912 43 32.3214 42.9934 32.8406 42.9669C34.2958 42.8984 35.1407 42.785 36.075 42.5435C38.6512 41.8786 40.7842 40.132 41.945 37.737C42.5287 36.5329 42.8247 35.3619 42.9586 33.6626C42.9877 33.2921 43 27.385 43 21.486C43 15.5858 42.9867 9.6897 42.9576 9.31921C42.822 7.59245 42.5261 6.43136 41.9235 5.20409C41.4291 4.19946 40.8801 3.4492 40.0832 2.68211C38.6608 1.32319 36.9213 0.496189 34.8484 0.197153C33.844 0.0519251 33.6439 0.00892233 28.5047 0H21.507Z" fill="url(#paint0_radial_205_130)"/>
    <path d="M21.507 0C12.5309 0 9.90578 0.00926348 9.3955 0.0515999C7.55347 0.204758 6.40725 0.494873 5.15848 1.11675C4.19613 1.59477 3.43715 2.14885 2.6881 2.92557C1.32394 4.34204 0.49717 6.08467 0.197874 8.15613C0.0523698 9.16176 0.0100331 9.36684 0.00143577 14.5035C-0.00186338 16.2157 0.00143577 18.4691 0.00143577 21.4916C0.00143577 30.4628 0.0113494 33.086 0.0543521 33.5954C0.203171 35.3884 0.484265 36.5164 1.07954 37.7503C2.21718 40.1121 4.38991 41.8852 6.94959 42.5468C7.83589 42.7751 8.81478 42.9008 10.0715 42.9603C10.6039 42.9835 16.0308 43 21.461 43C26.8912 43 32.3214 42.9934 32.8406 42.9669C34.2958 42.8984 35.1407 42.785 36.075 42.5435C38.6512 41.8786 40.7842 40.132 41.945 37.737C42.5287 36.5329 42.8247 35.3619 42.9586 33.6626C42.9877 33.2921 43 27.385 43 21.486C43 15.5858 42.9867 9.6897 42.9576 9.31921C42.822 7.59245 42.5261 6.43136 41.9235 5.20409C41.4291 4.19946 40.8801 3.4492 40.0832 2.68211C38.6608 1.32319 36.9213 0.496189 34.8484 0.197153C33.844 0.0519251 33.6439 0.00892233 28.5047 0H21.507Z" fill="url(#paint1_radial_205_130)"/>
    <path d="M21.507 0C12.5309 0 9.90578 0.00926348 9.3955 0.0515999C7.55347 0.204758 6.40725 0.494873 5.15848 1.11675C4.19613 1.59477 3.43715 2.14885 2.6881 2.92557C1.32394 4.34204 0.49717 6.08467 0.197874 8.15613C0.0523698 9.16176 0.0100331 9.36684 0.00143577 14.5035C-0.00186338 16.2157 0.00143577 18.4691 0.00143577 21.4916C0.00143577 30.4628 0.0113494 33.086 0.0543521 33.5954C0.203171 35.3884 0.484265 36.5164 1.07954 37.7503C2.21718 40.1121 4.38991 41.8852 6.94959 42.5468C7.83589 42.7751 8.81478 42.9008 10.0715 42.9603C10.6039 42.9835 16.0308 43 21.461 43C26.8912 43 32.3214 42.9934 32.8406 42.9669C34.2958 42.8984 35.1407 42.785 36.075 42.5435C38.6512 41.8786 40.7842 40.132 41.945 37.737C42.5287 36.5329 42.8247 35.3619 42.9586 33.6626C42.9877 33.2921 43 27.385 43 21.486C43 15.5858 42.9867 9.6897 42.9576 9.31921C42.822 7.59245 42.5261 6.43136 41.9235 5.20409C41.4291 4.19946 40.8801 3.4492 40.0832 2.68211C38.6608 1.32319 36.9213 0.496189 34.8484 0.197153C33.844 0.0519251 33.6439 0.00892233 28.5047 0H21.507Z" fill="url(#paint2_radial_205_130)"/>
    <path d="M21.507 0C12.5309 0 9.90578 0.00926348 9.3955 0.0515999C7.55347 0.204758 6.40725 0.494873 5.15848 1.11675C4.19613 1.59477 3.43715 2.14885 2.6881 2.92557C1.32394 4.34204 0.49717 6.08467 0.197874 8.15613C0.0523698 9.16176 0.0100331 9.36684 0.00143577 14.5035C-0.00186338 16.2157 0.00143577 18.4691 0.00143577 21.4916C0.00143577 30.4628 0.0113494 33.086 0.0543521 33.5954C0.203171 35.3884 0.484265 36.5164 1.07954 37.7503C2.21718 40.1121 4.38991 41.8852 6.94959 42.5468C7.83589 42.7751 8.81478 42.9008 10.0715 42.9603C10.6039 42.9835 16.0308 43 21.461 43C26.8912 43 32.3214 42.9934 32.8406 42.9669C34.2958 42.8984 35.1407 42.785 36.075 42.5435C38.6512 41.8786 40.7842 40.132 41.945 37.737C42.5287 36.5329 42.8247 35.3619 42.9586 33.6626C42.9877 33.2921 43 27.385 43 21.486C43 15.5858 42.9867 9.6897 42.9576 9.31921C42.822 7.59245 42.5261 6.43136 41.9235 5.20409C41.4291 4.19946 40.8801 3.4492 40.0832 2.68211C38.6608 1.32319 36.9213 0.496189 34.8484 0.197153C33.844 0.0519251 33.6439 0.00892233 28.5047 0H21.507Z" fill="url(#paint3_radial_205_130)"/>
    <path d="M21.5087 5.52148C17.1667 5.52148 16.6218 5.54045 14.9164 5.618C13.2144 5.69588 12.0526 5.96515 11.0361 6.36023C9.98456 6.76827 9.09257 7.31411 8.20393 8.20243C7.31462 9.09043 6.76836 9.98174 6.35868 11.0322C5.96231 12.0483 5.69251 13.2095 5.61591 14.9096C5.53964 16.6137 5.51965 17.1586 5.51965 21.4973C5.51965 25.8361 5.53898 26.379 5.61624 28.083C5.69452 29.7838 5.96398 30.9447 6.359 31.9605C6.76769 33.0113 7.31394 33.9026 8.20292 34.7906C9.09125 35.6792 9.98323 36.2264 11.0341 36.6345C12.0513 37.0295 13.2134 37.2988 14.9151 37.3767C16.6205 37.4542 17.165 37.4732 21.5067 37.4732C25.849 37.4732 26.3923 37.4542 28.0976 37.3767C29.7997 37.2988 30.9628 37.0295 31.98 36.6344C33.0312 36.2264 33.9218 35.6792 34.8102 34.7906C35.6995 33.9026 36.2457 33.0113 36.6554 31.9609C37.0484 30.9447 37.3182 29.7835 37.3982 28.0834C37.4748 26.3793 37.4948 25.8361 37.4948 21.4973C37.4948 17.1585 37.4748 16.6141 37.3982 14.91C37.3182 13.2092 37.0484 12.0483 36.6554 11.0325C36.2457 9.98174 35.6995 9.09042 34.8102 8.20243C33.9208 7.31377 33.0315 6.76793 31.979 6.36022C30.9598 5.96515 29.7973 5.69588 28.0953 5.618C26.39 5.54045 25.847 5.52148 21.5037 5.52148H21.5087ZM20.0745 8.40047C20.5002 8.39981 20.9751 8.40047 21.5087 8.40047C25.7774 8.40047 26.2834 8.41578 27.9691 8.49233C29.5279 8.56356 30.3739 8.82382 30.9375 9.04249C31.6836 9.33205 32.2155 9.6782 32.7747 10.2374C33.3343 10.7965 33.6807 11.329 33.9711 12.0746C34.19 12.6371 34.4508 13.4824 34.5217 15.0401C34.5983 16.7242 34.615 17.2301 34.615 21.4937C34.615 25.7572 34.5983 26.2632 34.5217 27.9473C34.4504 29.5049 34.19 30.3503 33.9711 30.9128C33.6814 31.6583 33.3343 32.1892 32.7747 32.748C32.2152 33.3072 31.6839 33.6533 30.9375 33.9429C30.3746 34.1625 29.5279 34.4221 27.9691 34.4934C26.2837 34.5699 25.7774 34.5866 21.5087 34.5866C17.2397 34.5866 16.7337 34.5699 15.0483 34.4934C13.4895 34.4215 12.6435 34.1612 12.0796 33.9425C11.3335 33.653 10.8006 33.3068 10.241 32.7477C9.68146 32.1885 9.33506 31.6573 9.04461 30.9114C8.82578 30.349 8.56498 29.5036 8.49404 27.9459C8.41743 26.2618 8.4021 25.7559 8.4021 21.4897C8.4021 17.2235 8.41743 16.7202 8.49404 15.0361C8.56532 13.4785 8.82578 12.6331 9.04461 12.0699C9.33438 11.3244 9.68146 10.7919 10.241 10.2327C10.8006 9.67354 11.3335 9.3274 12.0796 9.03718C12.6432 8.8175 13.4895 8.55791 15.0483 8.48633C16.5232 8.41976 17.0948 8.39981 20.0745 8.39646L20.0745 8.40047ZM30.0428 11.0531C28.9836 11.0531 28.1243 11.9108 28.1243 12.9696C28.1243 14.028 28.9836 14.8867 30.0428 14.8867C31.102 14.8867 31.9614 14.028 31.9614 12.9696C31.9614 11.9112 31.102 11.0525 30.0428 11.0525L30.0428 11.0531ZM21.5087 13.2931C16.9745 13.2931 13.2984 16.9665 13.2984 21.4973C13.2984 26.0282 16.9745 29.6999 21.5087 29.6999C26.0429 29.6999 29.7177 26.0282 29.7177 21.4973C29.7177 16.9665 26.0426 13.2931 21.5084 13.2931H21.5087ZM21.5087 16.1721C24.4518 16.1721 26.838 18.5561 26.838 21.4973C26.838 24.4382 24.4518 26.8226 21.5087 26.8226C18.5653 26.8226 16.1795 24.4382 16.1795 21.4973C16.1795 18.5561 18.5653 16.1721 21.5087 16.1721Z" fill="white"/>
    </g>
    <defs>
    <radialGradient id="paint0_radial_205_130" cx="0" cy="0" r="1" gradientTransform="matrix(-26.4431 7.45756 -5.3729 -19.0509 41.6115 20.1546)" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FF005F"/>
    <stop offset="1" stop-color="#FC01D8"/>
    </radialGradient>
    <radialGradient id="paint1_radial_205_130" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(11.4215 46.3119) rotate(-90) scale(34.3234 36.4164)">
    <stop stop-color="#FFCC00"/>
    <stop offset="0.1242" stop-color="#FFCC00"/>
    <stop offset="0.5672" stop-color="#FE4A05"/>
    <stop offset="0.6942" stop-color="#FF0F3F"/>
    <stop offset="1" stop-color="#FE0657" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="paint2_radial_205_130" cx="0" cy="0" r="1" gradientTransform="matrix(7.12432 -12.2754 15.9812 9.2751 22.5866 42.3936)" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FFCC00"/>
    <stop offset="1" stop-color="#FFCC00" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="paint3_radial_205_130" cx="0" cy="0" r="1" gradientTransform="matrix(-26.1528 7.36418 -2.50833 -8.91041 5.83415 1.75095)" gradientUnits="userSpaceOnUse">
    <stop stop-color="#780CFF"/>
    <stop offset="1" stop-color="#820BFF" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip0_205_130">
    <rect width="43" height="43" fill="white"/>
    </clipPath>
    </defs>
    </svg>
`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 62 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M59.9065 6.70851C59.2028 4.06787 57.1298 1.98848 54.4971 1.28276C49.7258 0.000204896 30.5925 0.000204235 30.5925 0.000204235C30.5925 0.000204235 11.4594 0.000204896 6.68791 1.28276C4.05546 1.98848 1.98211 4.06787 1.27854 6.70851C0 11.4945 0 21.4801 0 21.4801C0 21.4801 0 31.4656 1.27854 36.252C1.98211 38.8923 4.05546 40.9717 6.68791 41.6777C11.4594 42.96 30.5925 42.96 30.5925 42.96C30.5925 42.96 49.7258 42.96 54.4971 41.6777C57.1298 40.9717 59.2028 38.8923 59.9065 36.252C61.1851 31.4656 61.1851 21.4801 61.1851 21.4801C61.1851 21.4801 61.1851 11.4945 59.9065 6.70851Z" fill="#ED1D24"/>
    <path d="M24.3359 30.5469L40.3275 21.4812L24.3359 12.4146V30.5469Z" fill="white"/>
    </svg>
`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 20 18" fill="black"><path d="M15.4033 0.160614H18.2852L11.989 7.36161L19.396 17.1606H13.5964L9.054 11.2176L3.85637 17.1606H0.972692L7.70709 9.45831L0.601562 0.160614H6.54839L10.6544 5.59276L15.4033 0.160614ZM14.3918 15.4344H15.9887L5.68067 1.7961H3.96702L14.3918 15.4344Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 43 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_205_137)">
    <rect width="43" height="43" rx="21.5" fill="white"/>
    <path d="M21.5177 0C9.63425 0 0 9.61842 0 21.4823C0 30.588 5.6672 38.3676 13.6721 41.4971C13.4773 39.7998 13.3179 37.183 13.743 35.3265C14.1326 33.6468 16.2578 24.6472 16.2578 24.6472C16.2578 24.6472 15.6202 23.3565 15.6202 21.4646C15.6202 18.4766 17.3558 16.2488 19.5164 16.2488C21.3583 16.2488 22.2438 17.6279 22.2438 19.2722C22.2438 21.111 21.0749 23.8692 20.4551 26.433C19.9415 28.5724 21.5354 30.3228 23.6429 30.3228C27.4682 30.3228 30.4081 26.2915 30.4081 20.4922C30.4081 15.347 26.7067 11.7578 21.4114 11.7578C15.2837 11.7578 11.6886 16.3372 11.6886 21.0757C11.6886 22.9145 12.397 24.8947 13.2825 25.9733C13.4596 26.1854 13.4773 26.3799 13.4242 26.5921C13.2648 27.264 12.8929 28.7315 12.822 29.0321C12.7335 29.4211 12.5033 29.5095 12.0959 29.315C9.40402 28.0596 7.72156 24.1521 7.72156 20.9873C7.72156 14.2155 12.6449 7.99178 21.9427 7.99178C29.3986 7.99178 35.2075 13.2961 35.2075 20.4038C35.2075 27.8121 30.5321 33.7706 24.0502 33.7706C21.8719 33.7706 19.8175 32.639 19.1268 31.2952C19.1268 31.2952 18.0465 35.3972 17.7808 36.405C17.3027 38.2792 15.9921 40.6131 15.1066 42.0452C17.1256 42.6641 19.2508 43 21.4822 43C33.3657 43 42.9999 33.3816 42.9999 21.5177C43.0353 9.61842 33.4011 0 21.5177 0Z" fill="#E60023"/>
    </g>
    <defs>
    <clipPath id="clip0_205_137">
    <rect width="43" height="43" rx="21.5" fill="white"/>
    </clipPath>
    </defs>
    </svg>
`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 19" fill="#0A66C2"><path d="M16.65 0.660614H1.35C0.99196 0.660614 0.64858 0.802844 0.39541 1.05602C0.14223 1.30919 0 1.65257 0 2.01061V17.3106C0 17.6686 0.14223 18.012 0.39541 18.2652C0.64858 18.5184 0.99196 18.6606 1.35 18.6606H16.65C17.008 18.6606 17.3514 18.5184 17.6046 18.2652C17.8578 18.012 18 17.6686 18 17.3106V2.01061C18 1.65257 17.8578 1.30919 17.6046 1.05602C17.3514 0.802844 17.008 0.660614 16.65 0.660614ZM5.4 15.9606H2.7V7.86061H5.4V15.9606ZM4.05 6.28561C3.74056 6.27677 3.4406 6.17693 3.18758 5.99858C2.93456 5.82023 2.7397 5.57127 2.62737 5.28281C2.51503 4.99435 2.49019 4.67918 2.55595 4.37668C2.6217 4.07419 2.77515 3.79777 2.9971 3.58199C3.21906 3.3662 3.49968 3.2206 3.80391 3.16339C4.10814 3.10617 4.42248 3.13988 4.70766 3.2603C4.99284 3.38071 5.23622 3.5825 5.40737 3.84044C5.57853 4.09839 5.66987 4.40105 5.67 4.71061C5.66289 5.13392 5.4885 5.53721 5.18495 5.83234C4.88139 6.12746 4.47335 6.29043 4.05 6.28561ZM15.3 15.9606H12.6V11.6946C12.6 10.4166 12.06 9.95761 11.358 9.95761C11.1522 9.97131 10.9511 10.0255 10.7663 10.1172C10.5815 10.2088 10.4166 10.3361 10.2811 10.4916C10.1457 10.6472 10.0422 10.828 9.9768 11.0236C9.9114 11.2192 9.8853 11.4258 9.9 11.6316C9.8955 11.6735 9.8955 11.7157 9.9 11.7576V15.9606H7.2V7.86061H9.81V9.03061C10.0733 8.63011 10.435 8.30391 10.8605 8.08331C11.286 7.86271 11.761 7.75501 12.24 7.77061C13.635 7.77061 15.264 8.54461 15.264 11.0646L15.3 15.9606Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 18 21" fill="black"><path d="M13.9062 9.91201C13.8179 9.86961 13.7283 9.82891 13.6374 9.78991C13.4793 6.87432 11.8868 5.20515 9.2127 5.18807C9.2006 5.188 9.1886 5.188 9.1765 5.188C7.5771 5.188 6.24686 5.87097 5.42813 7.11376L6.89876 8.12297C7.5104 7.19465 8.4703 6.99675 9.1772 6.99675C9.1853 6.99675 9.1935 6.99675 9.2016 6.99682C10.0821 7.00244 10.7465 7.25853 11.1765 7.75794C11.4894 8.12153 11.6987 8.62396 11.8023 9.25801C11.0217 9.12531 10.1775 9.08451 9.275 9.13631C6.73265 9.28281 5.09824 10.7661 5.20801 12.8272C5.26371 13.8727 5.78436 14.7721 6.67398 15.3597C7.4261 15.8564 8.3949 16.0993 9.4017 16.0443C10.7313 15.9714 11.7744 15.4639 12.5021 14.536C13.0547 13.8313 13.4042 12.9181 13.5586 11.7674C14.1922 12.1499 14.6618 12.6534 14.9212 13.2585C15.3622 14.2873 15.3879 15.9778 14.0091 17.356C12.801 18.5634 11.3488 19.0857 9.1542 19.1018C6.71979 19.0838 4.87867 18.3027 3.68162 16.7804C2.56068 15.3549 1.98138 13.2959 1.95976 10.6606C1.98138 8.02527 2.56068 5.96628 3.68162 4.54079C4.87867 3.01848 6.71976 2.23746 9.1542 2.21936C11.6063 2.2376 13.4795 3.02237 14.7223 4.55204C15.3318 5.30217 15.7912 6.24551 16.0941 7.34541L17.8175 6.88543C17.4504 5.53157 16.8726 4.36494 16.0865 3.39742C14.4931 1.43632 12.1628 0.431454 9.1602 0.410614H9.1482C6.15171 0.431374 3.84748 1.44007 2.29949 3.40866C0.922 5.16046 0.21145 7.59796 0.18757 10.6534L0.1875 10.6606L0.18757 10.6678C0.21145 13.7232 0.922 16.1608 2.29949 17.9126C3.84748 19.8811 6.15171 20.8899 9.1482 20.9106H9.1602C11.8242 20.8921 13.702 20.1944 15.2489 18.6482C17.2729 16.6255 17.2119 14.09 16.5449 12.5335C16.0663 11.4173 15.1539 10.5107 13.9062 9.91201ZM9.3065 14.2382C8.1923 14.301 7.0347 13.8006 6.97759 12.729C6.93528 11.9344 7.5428 11.0478 9.3749 10.9421C9.5847 10.93 9.7906 10.9241 9.9928 10.9241C10.6583 10.9241 11.2809 10.9888 11.8468 11.1126C11.6357 13.75 10.3975 14.1783 9.3065 14.2382Z"/></svg>`,
  (size: number) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 22 19" fill="#0A7AFF"><path d="M11.0012 9.11412C10.0788 7.19959 7.5657 3.63195 5.22962 1.87217C3.54403 0.602716 0.8125 -0.379854 0.8125 2.74617C0.8125 3.37023 1.1691 7.99082 1.37861 8.74092C2.10583 11.3486 4.75648 12.0137 7.11421 11.6113C2.99288 12.3149 1.94472 14.6456 4.20884 16.9763C8.50879 21.4029 10.3892 15.8657 10.8707 14.4469C10.9598 14.1849 11.0012 14.0633 11.0012 14.1709C11.0012 14.0633 11.0426 14.1849 11.1317 14.4469C11.6132 15.8657 13.4936 21.4029 17.7936 16.9763C20.0577 14.6456 19.0095 12.3149 14.8882 11.6113C17.2459 12.0137 19.8966 11.3486 20.6238 8.74092C20.8333 7.99082 21.1899 3.37023 21.1899 2.74617C21.1899 -0.379854 18.4587 0.602716 16.7728 1.87217C14.4367 3.63195 11.9236 7.19959 11.0012 9.11412Z"/></svg>`,
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
        "pointer-events-none relative overflow-hidden min-h-screen opacity-20",
        className,
      )}
      ref={containerRef}
      aria-hidden="true"
    />
  );
};
