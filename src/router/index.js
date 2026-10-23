import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import ClubsView from '../views/ClubsView.vue';
import CreateClubView from '../views/CreateClubView.vue';
import JoinClubView from '../views/JoinClubView.vue';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import SessionsView from '../views/SessionsView.vue';
import SessionDetailView from '../views/SessionDetailView.vue';
import StatsView from '../views/StatsView.vue';
import AccountView from '../views/AccountView.vue';
import AdminSessionsView from '../views/admin/AdminSessionsView.vue';
import AdminSessionView from '../views/admin/AdminSessionView.vue';
import AdminMembersView from '../views/admin/AdminMembersView.vue';
import AdminClubView from '../views/admin/AdminClubView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const routes = [
  {
    path: '/',
    redirect: '/clubs',
  },
  {
    path: '/clubs',
    name: 'clubs',
    component: ClubsView,
  },
  {
    path: '/clubs/new',
    name: 'club-new',
    component: CreateClubView,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterView,
  },
  {
    path: '/account',
    name: 'account',
    component: AccountView,
    meta: { requiresAuth: true },
  },
  {
    path: '/c/:clubSlug/join',
    name: 'club-join',
    component: JoinClubView,
    meta: { requiresAuth: true, club: true },
  },
  {
    path: '/c/:clubSlug',
    name: 'home',
    component: HomeView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
    },
  },
  {
    path: '/c/:clubSlug/sessions',
    name: 'sessions',
    component: SessionsView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
    },
  },
  {
    path: '/c/:clubSlug/sessions/:id',
    name: 'session-detail',
    component: SessionDetailView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
    },
  },
  {
    path: '/c/:clubSlug/stats',
    name: 'stats',
    component: StatsView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
    },
  },
  {
    path: '/c/:clubSlug/admin/sessions',
    name: 'admin-sessions',
    component: AdminSessionsView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/c/:clubSlug/admin/sessions/:id',
    name: 'admin-session',
    component: AdminSessionView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/c/:clubSlug/admin/members',
    name: 'admin-members',
    component: AdminMembersView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/c/:clubSlug/admin/club',
    name: 'admin-club',
    component: AdminClubView,
    meta: {
      requiresAuth: true,
      club: true,
      requiresMembership: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!auth.ready) {
    await auth.bootstrap();
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.club) {
    const clubSlug = String(to.params.clubSlug || '');
    const loaded = await auth.loadClub(clubSlug);

    if (!loaded) {
      return {
        name: 'clubs',
        query: { missing: clubSlug },
      };
    }

    if (to.meta.requiresMembership && auth.membership?.status !== 'active') {
      return {
        name: 'club-join',
        params: { clubSlug },
      };
    }

    if (to.meta.requiresAdmin && !auth.isAdmin) {
      return {
        name: 'home',
        params: { clubSlug },
      };
    }

    if (to.name === 'club-join' && auth.membership?.status === 'active') {
      return {
        name: 'home',
        params: { clubSlug },
      };
    }
  } else {
    auth.clearClub();
  }

  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'clubs' };
  }

  return true;
});

export default router;
