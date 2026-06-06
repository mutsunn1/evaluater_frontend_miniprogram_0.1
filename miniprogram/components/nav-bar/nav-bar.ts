import { getNavLayout } from '../../modules/nav-helper';

Component({
  properties: {
    userId: { type: String, value: '' },
    profileOpen: { type: Boolean, value: false },
  },

  data: {
    layout: {
      statusBarHeight: 0,
      navBarHeight: 64,
      totalHeight: 64,
      capsuleLeft: 0,
      capsuleWidth: 0,
      capsuleBottom: 0,
      businessBarTop: 0,
      businessBarHeight: 64,
    },
  },

  lifetimes: {
    attached() {
      const layout = getNavLayout();
      this.setData({ layout });
    },
  },

  methods: {
    onEndTap() {
      this.triggerEvent('end');
    },
    onExitTap() {
      this.triggerEvent('exit');
    },
    onProfileTap() {
      this.triggerEvent('profiletoggle');
    },
  },
});
