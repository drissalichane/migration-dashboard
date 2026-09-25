# .NET Migration Platform — dashboard

The web app of the .NET Migration Platform: start a migration, review the AI-generated plan, follow
the run live, and review the code before the pull request is opened.

**To run the platform, follow the guide in the backend repository:**
[migration-backend → README](https://github.com/drissalichane/migration-backend#readme). It runs this
dashboard, the API and n8n together with Docker Compose — clone this repository next to it as
`migration_dashboard`.

For development on the dashboard itself (the API and n8n must be running):

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check and production build
npm run lint
```
