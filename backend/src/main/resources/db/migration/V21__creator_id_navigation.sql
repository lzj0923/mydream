-- Expose the AI KOL certification overview through the currently published primary navigation.
INSERT INTO cms_navigation_item(
  public_id,
  navigation_version_id,
  parent_id,
  label,
  link_type,
  link_value,
  target,
  sort_order,
  visible
)
SELECT
  UUID(),
  released_navigation.navigation_version_id,
  NULL,
  'AI KOL',
  'INTERNAL',
  '/creator-id',
  '_self',
  COALESCE((
    SELECT MAX(existing_item.sort_order) + 1
    FROM cms_navigation_item existing_item
    WHERE existing_item.navigation_version_id = released_navigation.navigation_version_id
      AND existing_item.parent_id IS NULL
  ), 0),
  TRUE
FROM cms_site site
JOIN cms_site_release active_release ON active_release.id = site.active_release_id
JOIN cms_release_navigation released_navigation ON released_navigation.release_id = active_release.id
JOIN cms_navigation navigation ON navigation.id = released_navigation.navigation_id
WHERE site.site_key = 'mydream'
  AND navigation.nav_key = 'primary'
  AND NOT EXISTS (
    SELECT 1
    FROM cms_navigation_item existing_item
    WHERE existing_item.navigation_version_id = released_navigation.navigation_version_id
      AND existing_item.link_type = 'INTERNAL'
      AND existing_item.link_value = '/creator-id'
  );
