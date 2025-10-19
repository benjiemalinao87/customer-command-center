# Automated Changelog Process

## Commit Message Format
All commits must follow this format:
```
Title of Change

Key details and improvements:
- Point 1
- Point 2
- Point 3

Lessons Learned:
- Lesson 1
- Lesson 2
- Lesson 3
```

## Automated Tools
1. Git Commit Template
   - Location: `.gitmessage`
   - Automatically loaded when making commits
   - Provides the required format structure

2. Post-Push Hook
   - Location: `.git/hooks/post-push`
   - Automatically runs after every push
   - Executes the changelog script
   - Updates documentation files:
     - progress.md
     - lessons_learn.md
     - roadmap.md

## Categories Available
- feature: New features
- bugfix: Bug fixes
- enhancement: Improvements
- documentation: Docs
- testing: Tests
- refactor: Code cleanup
- other: Misc changes

## Team Detection
- Frontend: Changes in frontend/
- Backend: Changes in backend/ or supabase/
- Full Stack: Changes in both

## Important Notes
- Always follow the commit message format
- Ensure lessons learned are meaningful and helpful
- Keep documentation up to date
- Check the changelog webhook response for success 