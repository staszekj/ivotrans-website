# Docker Registry - Instrukcje dla AI Agent

## 📋 Informacje o registry

- **URL**: `https://docker-registry.eltrue`
- **Namespace**: `prod` (Kubernetes)
- **Autentykacja**: Basic Auth
  - Username: `stan`
  - Password: `Qqquen2121`
- **Certyfikat CA**: `~/.eltrue-secrets/eltrue-ca.crt` (self-signed)
- **Dostęp**: Tylko z sieci LAN (192.168.18.0/24, 192.168.3.0/24, 192.168.30.0/24)
- **Storage**: 10Gi PVC
- **Funkcja**: Caching proxy dla Docker Hub + własne obrazy

## 🔐 Weryfikacja połączenia

```bash
# Test endpoint
curl --cacert ~/.eltrue-secrets/eltrue-ca.crt \
  -u stan:Qqquen2121 \
  https://docker-registry.eltrue/v2/

# Lista obrazów
curl --cacert ~/.eltrue-secrets/eltrue-ca.crt \
  -u stan:Qqquen2121 \
  https://docker-registry.eltrue/v2/_catalog
```

## 📥 Jak dodać obraz do registry

### Metoda 1: Push własnego obrazu z zewnętrznej maszyny

**UWAGA**: To działa TYLKO na maszynie z zainstalowanym Docker daemon (poza klastrem K8s)

1. **Zainstaluj certyfikat CA** (na maszynie z Dockerem):
```bash
sudo mkdir -p /etc/docker/certs.d/docker-registry.eltrue
sudo cp ~/.eltrue-secrets/eltrue-ca.crt /etc/docker/certs.d/docker-registry.eltrue/ca.crt
```

2. **Zaloguj się do registry**:
```bash
docker login docker-registry.eltrue -u stan -p Qqquen2121
```

3. **Tag obrazu**:
```bash
# Jeśli masz lokalny obraz:
docker tag moj-obraz:latest docker-registry.eltrue/moj-obraz:latest

# Jeśli chcesz przepchać obraz z Docker Hub:
docker pull nginx:alpine
docker tag nginx:alpine docker-registry.eltrue/nginx:alpine
```

4. **Push do registry**:
```bash
docker push docker-registry.eltrue/moj-obraz:latest
```

### Metoda 2: Build i push z Kubernetes (bez Docker daemon)

**UWAGA**: W środowisku K8s używamy narzędzi kompatybilnych z OCI (buildah, kaniko, podman)

#### Opcja A: Użyj buildah (w podzie K8s)

```bash
# Build obrazu
buildah bud -t docker-registry.eltrue/moj-app:v1.0 .

# Push do registry (z certyfikatem)
buildah push \
  --cert-dir /etc/ssl/certs \
  --creds stan:Qqquen2121 \
  docker-registry.eltrue/moj-app:v1.0
```

#### Opcja B: Użyj kaniko (Job w K8s)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: build-and-push
  namespace: prod
spec:
  template:
    spec:
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
        - "--dockerfile=Dockerfile"
        - "--context=git://github.com/user/repo"
        - "--destination=docker-registry.eltrue/moj-app:v1.0"
        - "--insecure-registry=docker-registry.eltrue"
        volumeMounts:
        - name: docker-config
          mountPath: /kaniko/.docker/
      volumes:
      - name: docker-config
        secret:
          secretName: docker-registry-auth
          items:
          - key: .dockerconfigjson
            path: config.json
      restartPolicy: Never
```

### Metoda 3: Import obrazu przez curl (manualne)

**UWAGA**: To zaawansowana metoda - wymaga znajomości Docker Registry API v2

```bash
# 1. Eksportuj obraz do tar
docker save moj-obraz:latest -o moj-obraz.tar

# 2. Rozpakuj i użyj skrypt do upload'u przez API
# (wymaga implementacji registry API v2 push flow)
```

## 🔍 Pobieranie obrazów z registry

### Z maszyny z Dockerem:

```bash
# Zainstaluj certyfikat (jak wyżej)
sudo cp ~/.eltrue-secrets/eltrue-ca.crt /etc/docker/certs.d/docker-registry.eltrue/ca.crt

# Pull obrazu
docker pull docker-registry.eltrue/library/alpine:latest
```

### Z Kubernetes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: prod
spec:
  containers:
  - name: app
    image: docker-registry.eltrue/moj-app:v1.0
  imagePullSecrets:
  - name: docker-registry-pull-secret
```

Najpierw stwórz secret:
```bash
kubectl create secret docker-registry docker-registry-pull-secret \
  -n prod \
  --docker-server=docker-registry.eltrue \
  --docker-username=stan \
  --docker-password=Qqquen2121 \
  --docker-email=stan@eltrue
```

## 📊 Przydatne komendy

```bash
# Lista wszystkich obrazów
curl --cacert ~/.eltrue-secrets/eltrue-ca.crt \
  -u stan:Qqquen2121 \
  https://docker-registry.eltrue/v2/_catalog

# Lista tagów dla obrazu
curl --cacert ~/.eltrue-secrets/eltrue-ca.crt \
  -u stan:Qqquen2121 \
  https://docker-registry.eltrue/v2/library/alpine/tags/list

# Pobierz manifest
curl --cacert ~/.eltrue-secrets/eltrue-ca.crt \
  -u stan:Qqquen2121 \
  -H "Accept: application/vnd.oci.image.index.v1+json" \
  https://docker-registry.eltrue/v2/library/alpine/manifests/latest

# Sprawdź logi registry
kubectl logs -n prod -l app=docker-registry --tail=50

# Sprawdź użycie storage
kubectl exec -n prod -it deployment/docker-registry -- du -sh /var/lib/registry
```

## 🚨 Ważne uwagi dla AI Agent

1. **Kontekst środowiska**: 
   - Jesteś w podzie K8s w namespace `dev`
   - Registry jest w namespace `prod`
   - Nie masz dostępu do Docker daemon w środowisku K8s

2. **Najlepsze podejście dla AI w K8s**:
   - Używaj `kubectl` do zarządzania obrazami w K8s
   - Dla weryfikacji używaj `curl` z CA cert
   - Nie próbuj używać `docker` commands (nie są dostępne)

3. **Proxy do Docker Hub**:
   - Registry automatycznie cache'uje obrazy z Docker Hub
   - Obrazy z Docker Hub są dostępne "on-the-fly" przez proxy
   - Pojawią się w `_catalog` tylko po pełnym pobraniu

4. **Self-signed certificate**:
   - ZAWSZE używaj `--cacert ~/.eltrue-secrets/eltrue-ca.crt` w curl
   - Lub użyj `--insecure-registry` w narzędziach build

5. **Troubleshooting**:
   - Sprawdź logi: `kubectl logs -n prod -l app=docker-registry`
   - Sprawdź pod: `kubectl get pods -n prod | grep docker-registry`
   - Test połączenia: `curl -v --cacert ~/.eltrue-secrets/eltrue-ca.crt https://docker-registry.eltrue/v2/`

## 📖 Referencje

- **Registry API v2**: https://docs.docker.com/registry/spec/api/
- **Docker Config**: `/home/stan/workspace/kubectl-config/prod/docker-registry.yaml`
- **Secrets**: `/home/stan/workspace/kubectl-config/prod/secret.yaml`
