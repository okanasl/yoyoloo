# YOYOLOO

Team: you only yolo once

An AI powered browser based video editing & rendering tool.

Submission for the [2025 Next.js hackathon](https://vercel.notion.site/next-hackathon-2025).

[Click to see demo.](https://yoyoloo-3dzkzrcvy-okanasls-projects.vercel.app)

Notes:

- Please make sure to have at least ~3$ in fal ai credits and ~1$ Anthropic credits. The agent will generate 8 seconds scene(s) by default unless you prompt otherwise.
- Media generation may take long on fal.ai side, please wait if that is the case.
- Currently messages are not stored. So, when you refresh the page, you won't see them again. Video asset URL's are stored tho.
- Provided credentials in UI are not being stored/logged anywhere except memory when needed. You'll be prompted each time you open studio page.
- Download button on right section of timeline will create mp4 file for you to download the output after generation.
- Manual editing is limited but you can drag on timeline for timing and canvas on the center for positioning.
- There's no user, so the scenes that you generated are publicly accessible on demo website.
- You can check an example output in `test_output` folder.
- Currently reAct agent runs 12 iterations. Idk what happens when we increase it yet.
