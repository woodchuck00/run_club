const platforms = {
  facebook: {
    label: 'Facebook',
    icon: 'fa-brands fa-facebook',
  },
  instagram: {
    label: 'Instagram',
    icon: 'fa-brands fa-instagram',
  },
  twitter: {
    label: 'X (Twitter)',
    icon: 'fa-brands fa-x-twitter',
  },
  x: {
    label: 'X',
    icon: 'fa-brands fa-x-twitter',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'fa-brands fa-linkedin',
  },
};

export function socialMeta(platform) {
  const key = String(platform || '').trim().toLowerCase();

  return platforms[key] || {
    label: platform ? String(platform) : 'Link',
    icon: 'fa-solid fa-link',
  };
}

export { platforms as socialPlatforms };
