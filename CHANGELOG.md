# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-04-24

### Added
- **Backend**: Added automatic resolution of VK User IDs to Internal DB User IDs in `createPostHandler` and `myPostsHandler` to prevent database foreign key constraints violations.
- **Frontend / Moderation**: Added `postModerated` event listener in `Moderation.tsx` to instantly update the UI when a post is approved and published.

### Changed
- **Backend / Publishing**: Modified `moderatePostHandler` to prioritize Community Token (`group.AccessToken`) over Admin User Token when publishing to the community wall.
- **Backend / Publishing**: Forced `fromGroup=true` flag for VK API `wall.post` calls to ensure the post is published on behalf of the community, not the user.
- **Documentation**: Restructured project documentation, created `PROJECT_MAPPING.md` to map out the separation between legacy projects and the current ZooPlatform architecture.

### Fixed
- **Backend / Publishing**: Fixed silent failures and 500 Server Errors caused by passing `vk_user_id` directly into the `posts` table `user_id` column which violated database constraints.
- **Frontend / UX**: Fixed an issue where a moderated post would remain visible in the queue on the frontend until the application was reloaded.
