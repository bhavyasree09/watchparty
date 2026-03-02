# Watch Party

This is a React + Vite template for a watch party application using Supabase.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project**
   - Go to https://app.supabase.com and create a free project.
   - Navigate to **Settings → API** and copy the `URL` and `anon` key.

3. **Create a `.env` file** (at the project root) with the following values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   > The Vite dev server automatically loads variables prefixed with `VITE_`.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Visit `http://localhost:5173` (or the address shown in the terminal).

6. **Create the required database tables**
   The application expects the following tables:
   - `profiles` (id, username, avatar_url, created_at)
   - `rooms` (id, name, host_id, is_playing, current_video_url, playback_time, created_at)
   - `room_members`
   - `messages`
   - `media_queue`

   You can recreate the schema by running the SQL from `src/types/supabase.ts` or using the
   [Supabase dashboard SQL editor](https://app.supabase.com).


## Screen sharing & video chat

This template includes a basic peer‑to‑peer video/chat component powered by
[`simple-peer`](https://github.com/feross/simple-peer) and Supabase Realtime
for signaling. When the host clicks the **screen share** button:

1. Their display is captured via `getDisplayMedia`.
2. The stream is sent to every other participant using WebRTC.
3. Everyone (including the host) sees the shared screen in the **main video
   area** (the same container normally used for queued videos).
4. Stopping screen share returns viewers to whatever `current_video_url` was
   playing in the room.

The connection is rebuilt whenever the media stream changes (Camera &rarr;
Screen, etc). The host controls are in `src/components/VideoChat.tsx` and the
player logic in `src/components/VideoPlayer.tsx`.

Because of this feature the project now depends on `simple-peer`, which is
included in `package.json`.
   > creating the tables:
   >
   > ```sql
   > alter table profiles enable row level security;
   >
   > create policy "Select own profile" on profiles
   >   for select using (auth.uid() = id);
   >
   > create policy "Insert own profile" on profiles
   >   for insert with check (auth.uid() = id);
   > ```
   >
   > Without these policies, the client will receive a 403 when attempting to insert
   > a new profile, which is what you saw when logging in.

---
