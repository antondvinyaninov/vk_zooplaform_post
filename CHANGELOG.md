# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-04-24

### Added
- **Frontend & Backend / Media Attachments**: Added support for uploading up to 10 photos and videos via `multipart/form-data` when creating a post. 
- **Backend / Media Processing**: Added Go client method `UploadVideo` to handle VK `video.save` two-step upload protocol, and updated `UploadPhotoToWall` to integrate with post creation flow.
- **Frontend / Moderation**: Implemented real-time media thumbnails fetching via VK API in the backend to display visual photo and video galleries directly in the moderation feed.
- **Frontend / UX**: Implemented client-side video thumbnail generation using `<canvas>` for instant feedback during post creation.
- **Backend**: Added automatic resolution of VK User IDs to Internal DB User IDs in `createPostHandler` and `myPostsHandler` to prevent database foreign key constraints violations.
- **Frontend / Moderation**: Added `postModerated` event listener in `Moderation.tsx` to instantly update the UI when a post is approved and published.
- **Backend / Settings**: Added support for selecting and storing Community City (city_id, city_title) integrating with VK `database.getCities` via App tokens.
- **Frontend / Settings**: Implemented `CustomSelect` city autocomplete with debounce for efficient VK API querying.

### Changed
- **Frontend / UX**: Replaced native file picker UI with VKUI File and `HorizontalScroll` gallery for attached media with custom deletion handlers.
- **Backend / API**: Changed authentication header expected by `createPostHandler` to use standard `X-VK-Sign` instead of `Authorization: Bearer`.
- **Backend / Publishing**: Modified `moderatePostHandler` to prioritize Community Token (`group.AccessToken`) over Admin User Token when publishing to the community wall.
- **Backend / Publishing**: Forced `fromGroup=true` flag for VK API `wall.post` calls to ensure the post is published on behalf of the community, not the user.
- **Documentation**: Restructured project documentation, created `PROJECT_MAPPING.md` to map out the separation between legacy projects and the current ZooPlatform architecture.

### Fixed
- **Backend / Publishing**: Fixed silent failures and 500 Server Errors caused by passing `vk_user_id` directly into the `posts` table `user_id` column which violated database constraints.
- **Frontend / UX**: Fixed an issue where a moderated post would remain visible in the queue on the frontend until the application was reloaded.
