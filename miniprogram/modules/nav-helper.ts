export interface NavLayout {
  statusBarHeight: number;
  navBarHeight: number;
  totalHeight: number;
  capsuleLeft: number;
  capsuleWidth: number;
  capsuleBottom: number;
  businessBarTop: number;
  businessBarHeight: number;
}

const BUSINESS_BAR_HEIGHT = 64;
const CAPSULE_BOTTOM_GAP = 8;

export function getNavLayout(): NavLayout {
  const wx = (globalThis as Record<string, unknown>).wx as
    | {
        getWindowInfo?: () => { statusBarHeight?: number };
        getSystemInfoSync?: () => { statusBarHeight?: number };
        getMenuButtonBoundingClientRect: () => {
          top: number;
          height: number;
          width: number;
          left: number;
          bottom: number;
          right: number;
        };
      }
    | undefined;

  if (!wx) {
    // Fallback for non-WeChat environments (tests, SSR)
    return {
      statusBarHeight: 0,
      navBarHeight: BUSINESS_BAR_HEIGHT,
      totalHeight: BUSINESS_BAR_HEIGHT,
      capsuleLeft: 300,
      capsuleWidth: 87,
      capsuleBottom: 44,
      businessBarTop: 0,
      businessBarHeight: BUSINESS_BAR_HEIGHT,
    };
  }

  const windowInfo = wx.getWindowInfo?.();
  const fallbackInfo = windowInfo ? undefined : wx.getSystemInfoSync?.();
  const statusBarHeight =
    windowInfo?.statusBarHeight ?? fallbackInfo?.statusBarHeight ?? 0;
  const menu = wx.getMenuButtonBoundingClientRect();

  const navBarHeight = BUSINESS_BAR_HEIGHT;
  const businessBarTop = menu.bottom + CAPSULE_BOTTOM_GAP;
  const totalHeight = businessBarTop + navBarHeight;

  return {
    statusBarHeight,
    navBarHeight,
    totalHeight,
    capsuleLeft: menu.left,
    capsuleWidth: menu.width,
    capsuleBottom: menu.bottom,
    businessBarTop,
    businessBarHeight: navBarHeight,
  };
}
