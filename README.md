# Astro Starter Kit: Minimal

```sh
pnpm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## � Docker & Kubernetes

### Build produkcyjny z Docker

```bash
docker build -t docker-registry.eltrue/ivotrans-website:latest .
docker push docker-registry.eltrue/ivotrans-website:latest
```

### Build z Kaniko (w klastrze K8s)

```bash
# 1. Stwórz secret do registry
kubectl apply -f k8s/docker-registry-secret.yaml

# 2. Uruchom build (Kaniko zbuduje i wyśle obraz do registry)
kubectl apply -f k8s/kaniko-build.yaml

# 3. Sprawdź postęp buildu
kubectl logs -n prod -l app=ivotrans-website-build -f

# 4. Po zakończeniu buildu - uruchom aplikację
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Pliki K8s

| Plik                              | Opis                    |
| --------------------------------- | ----------------------- |
| `k8s/docker-registry-secret.yaml` | Credentials do registry |
| `k8s/kaniko-build.yaml`           | Job budujący obraz      |
| `k8s/deployment.yaml`             | Deployment aplikacji    |
| `k8s/service.yaml`                | Service + Ingress       |

## �👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
