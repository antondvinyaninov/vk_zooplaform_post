# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-05-06

### Added
- **Frontend & Backend / Community Settings**: Implemented a comprehensive "Post Types & Questionnaires" system. Admins can define custom post categories with specific colors and attach dynamic required/optional form fields (text, phone with masking, links, checkboxes).
- **Frontend / Create Post**: Integrated dynamic form rendering in `CreateAd.tsx` based on the selected community category, automatically compiling structured questionnaire data into the post message.
- **Frontend / Moderation**: Added inline text editing capabilities for moderators directly within `ModerationDetail`.
- **Frontend / UI**: Redesigned publication statuses in `AdDetail` to display multiple community placements within a unified `<Group>` structure utilizing `<SimpleCell>`, `Avatar`, and VK wall post links.

### Changed
- **Backend / Posts**: Removed `pending`, `draft`, and `rejected` constraints in `updatePostContentHandler` for post authors, enabling unconditional post editing across all statuses and groups.
- **Frontend / Posts**: Decoupled editing authorization in `AdDetail` from current group publication status, prioritizing root author ownership.
- **Frontend / Settings**: Implemented conditional rendering in `CommunitySettings` to completely hide the categories and questionnaires configuration block when the `enablePostTypes` toggle is disabled.


## [Unreleased] - 2026-04-26

### Added
- **Backend / Database**: Added `is_test` boolean flag to `groups` table to segregate testing communities from production metrics.
- **Frontend / Admin**: Added "Тестовые группы" tab in the `Groups` management page to separate test environments from real connected communities.
- **Backend / Stability**: Implemented Database Connection Pooling (`SetMaxOpenConns`, `SetMaxIdleConns`) to prevent PostgreSQL "too many clients" exhaustion under heavy concurrent load.
- **Backend / Security**: Implemented a Token Bucket `RateLimiter` Middleware to protect endpoints from DDoS and brute-force attacks (max 60 requests/min per IP).
- **Backend / Security**: Performed a comprehensive Security Audit and Dependency Update, upgrading `pgx/v5` and `aws-sdk-go-v2` to latest secure versions.
- **Backend / Audit**: Integrated Business Audit Logging (`models.LogInfo`) across all major handlers to record user actions (logins, post creation/deletion, VK account connection) into `system_logs`.
- **Backend / Stability**: Implemented a global Panic Recovery Middleware that gracefully catches runtime panics, logs stack traces to `system_logs` table, and returns a 500 JSON response instead of crashing the process.
- **Backend / VK API**: Added Context Timeouts for all VK API requests, utilizing distinct durations (e.g., 15s for data, 10m for video uploads) instead of a global rigid `http.Client` 30s timeout.
- **Backend / VK API**: Implemented Exponential Backoff Automatic Retries (up to 3 attempts) for VK API limits (`ErrorCode 6`, `ErrorCode 9`) and internal 5xx errors to prevent temporary network issues from aborting transactions.
- **Backend / Posts**: Implemented soft-delete mechanism for posts (`status = 'deleted'`) to retain post analytics instead of hard physical deletion.
- **Backend / Posts**: Added `delete_reason` and `delete_comment` columns to capture user feedback upon post deletion.
- **Frontend / Posts**: Fixed a state-persistence bug in `DeletePostModal` where the delete button would remain permanently frozen ("loading") upon attempting to delete a second post.
- **Frontend / Posts**: Added `DeletePostModal` UI component to collect deletion reasons and optional comments when users delete their own posts.
- **Frontend / Core Architecture**: Bootstrapped and migrated the entire legacy admin panel to a modern Astro 4.0 architecture using React 18, Tailwind CSS, and shadcn/ui components (`frontadmin` module).
- **Frontend / Design System**: Implemented a comprehensive design system featuring light/dark mode theming, CSS variables, and modern accessible UI components.
- **Frontend / API**: Integrated `swr` data fetching library for caching and real-time UI updates across the Admin Panel.
- **Frontend / Auth**: Implemented VK OAuth token parsing and connection management flow in `vk-connect-card.tsx` bridging to Go Backend.
- **Frontend & Backend / Infrastructure**: Re-architected media uploads to bypass 10MB API Gateway limitations by implementing a direct client-to-Yandex-S3 upload flow using presigned URLs for all media types (photos and videos).
- **Frontend / UI**: Implemented native VKUI `Gallery` component with swipe functionality and bullet indicators for rendering multiple media attachments in detailed post views.
- **Backend / Fallbacks**: Added backwards compatibility in `createPostHandler` to support `multipart/form-data` uploads from users with older cached versions of the VK Mini App.
- **Frontend & Backend / Media Attachments**: Added support for uploading up to 10 photos and videos via `multipart/form-data` when creating a post. 
- **Backend / Media Processing**: Added Go client method `UploadVideo` to handle VK `video.save` two-step upload protocol, and updated `UploadPhotoToWall` to integrate with post creation flow.
- **Frontend / Moderation**: Implemented real-time media thumbnails fetching via VK API in the backend to display visual photo and video galleries directly in the moderation feed.
- **Frontend / UX**: Implemented client-side video thumbnail generation using `<canvas>` for instant feedback during post creation.
- **Backend**: Added automatic resolution of VK User IDs to Internal DB User IDs in `createPostHandler` and `myPostsHandler` to prevent database foreign key constraints violations.
- **Frontend / Moderation**: Added `postModerated` event listener in `Moderation.tsx` to instantly update the UI when a post is approved and published.
- **Backend / Settings**: Added support for selecting and storing Community City (city_id, city_title) integrating with VK `database.getCities` via App tokens.
- **Frontend / Settings**: Implemented `CustomSelect` city autocomplete with debounce for efficient VK API querying.

### Changed
- **Backend / Dashboard**: Modified global metrics queries (groups count, subscribers count, and post moderation stats) to strictly exclude communities marked with `is_test = true`.
- **Frontend / VK App**: Redesigned the `Onboarding` panel with a responsive, high-contrast custom layout, integrated the official brand logo, and updated copywriting to emphasize admin benefits.
- **Backend / Posts**: Modified `deletePostHandler` to execute soft-deletions using atomic database transactions (`BEGIN`/`COMMIT`/`ROLLBACK`), ensuring `posts` and `post_publications` tables remain perfectly synchronized.
- **Backend / VK API**: Deprecated `http.PostForm` and `http.NewRequest` across all VK integration endpoints in favor of `http.NewRequestWithContext`.
- **Frontend / Architecture**: Migrated all remaining mocked components (`UsersManagementCard`, `GroupSelector`, `SiteHeader`) to fetch live data from PostgreSQL backend via API endpoints.
- **Frontend / UI**: Replaced standard Radix UI `DropdownMenuTrigger` configurations with Base UI `render` pattern to resolve TypeScript strict typing errors.
- **Frontend / UX**: Replaced native file picker UI with VKUI File and `HorizontalScroll` gallery for attached media with custom deletion handlers.
- **Backend / API**: Changed authentication header expected by `createPostHandler` to use standard `X-VK-Sign` instead of `Authorization: Bearer`.
- **Backend / Publishing**: Modified `moderatePostHandler` to prioritize Community Token (`group.AccessToken`) over Admin User Token when publishing to the community wall.
- **Backend / Publishing**: Forced `fromGroup=true` flag for VK API `wall.post` calls to ensure the post is published on behalf of the community, not the user.
- **Documentation**: Restructured project documentation, created `PROJECT_MAPPING.md` to map out the separation between legacy projects and the current ZooPlatform architecture.

### Fixed
- **Backend / Posts**: Fixed critical 500 Internal Server Errors caused by unhandled `NULL` values in PostgreSQL `s3_video_key` and `attachments` columns by mapping them to `sql.NullString` during database scans.
- **Backend / Feed**: Fixed an issue where deleted records would still appear in the user's feed, by implementing `COALESCE(status, '') != 'deleted'` filter across `GetByUserID` queries.
- **Backend / S3 Integration**: Fixed `SignatureDoesNotMatch` errors causing pseudo-CORS "Network Errors" by enforcing safe ASCII suffixes for presigned URLs to handle Cyrillic filenames.
- **Backend / S3 Cleanup**: Added automatic garbage collection in S3 to delete orphaned media objects when a post is soft-deleted.
- **Frontend / Media Attachments**: Fixed iOS WKWebView freezes and crashes by disabling heavy synchronous local video thumbnail generation in `CreateAd` and `AdDetail`.
- **Backend / Publishing**: Fixed `UploadPhotoToWall` failing due to VK API rejecting files without extensions by explicitly appending the original file extension during temporary file generation.
- **Frontend / Rendering**: Fixed `populateAttachmentURLs` empty states by splitting comma-separated keys and classifying S3 keys dynamically based on their file extensions.
- **Backend / Publishing**: Fixed silent failures and 500 Server Errors caused by passing `vk_user_id` directly into the `posts` table `user_id` column which violated database constraints.
- **Frontend / UX**: Fixed an issue where a moderated post would remain visible in the queue on the frontend until the application was reloaded.
