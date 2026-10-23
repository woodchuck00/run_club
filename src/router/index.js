import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
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
import NotFoundView from '../views/NotFoundView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
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
    path: '/sessions',
    name: 'sessions',
    component: SessionsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/sessions/:id',
    name: 'session-detail',
    component: SessionDetailView,
    meta: { requiresAuth: true },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/account',
    name: 'account',
    component: AccountView,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/sessions',
    name: 'admin-sessions',
    component: AdminSessionsView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/sessions/:id',
    name: 'admin-session',
    component: AdminSessionView,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/admin/members',
    name: 'admin-members',
    component: AdminMembersView,
    meta: { requiresAuth: true, requiresAdmin: true },
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

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' };
  }

  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'home' };
  }

  return true;
});

export default router;
