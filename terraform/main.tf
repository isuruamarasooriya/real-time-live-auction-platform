# 1. Create Namespace for Argo CD
resource "kubernetes_namespace" "argocd" {
  metadata {
    name = var.argocd_namespace
  }
}

# 2. Install Argo CD via Helm 
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  version    = "5.46.7"

  set {
    name  = "server.service.type"
    value = "NodePort"
  }
}

# 3. Create Namespace for Prometheus and Grafana
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
  }
}

# 4. Install Kube-Prometheus-Stack via Helm
resource "helm_release" "prometheus_grafana" {
  name       = "prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "51.2.0"

  set {
    name  = "prometheus.prometheusSpec.resources.limits.memory"
    value = "512Mi"
  }
  set {
    name  = "grafana.resources.limits.memory"
    value = "256Mi"
  }
  
  set {
    name  = "alertmanager.enabled"
    value = "false"
  }

  set {
    name  = "grafana.admin.existingSecret"
    value = "grafana-auth-secret"
  }
  set {
    name  = "grafana.admin.userKey"
    value = "admin-user"
  }
  set {
    name  = "grafana.admin.passwordKey"
    value = "admin-password"
  }
}

# 5. Install Metrics Server
resource "helm_release" "metrics_server" {
  name       = "metrics-server"
  repository = "https://kubernetes-sigs.github.io/metrics-server/"
  chart      = "metrics-server"
  namespace  = "kube-system"
  version    = "3.12.1"

  set {
    name  = "args[0]"
    value = "--kubelet-insecure-tls"
  }
}

# 6. Install Prometheus Adapter
resource "helm_release" "prometheus_adapter" {
  name       = "prometheus-adapter"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-adapter"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = "4.10.0"

  set {
    name  = "prometheus.url"
    value = "http://prometheus-stack-kube-prom-prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
  }
  set {
    name  = "prometheus.port"
    value = "9090"
  }

  values = [
    yamlencode({
      rules = {
        custom = [
          {
            seriesQuery = "http_requests_total{namespace!=\"\",pod!=\"\"}"
            resources = {
              overrides = {
                namespace = { resource = "namespace" }
                pod       = { resource = "pod" }
              }
            }
            name = {
              matches = "http_requests_total"
              as      = "http_requests_per_second"
            }
            metricsQuery = "sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)"
          }
        ]
      }
    })
  ]
}

# 7. Install MongoDB via Helm
resource "helm_release" "mongodb" {
  name       = "mongodb"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "mongodb"
  version    = "15.0.0"
  namespace  = "default"

  set {
    name  = "image.tag"
    value = "latest" 
  }
  set {
    name  = "architecture"
    value = "standalone"
  }
  set {
    name  = "auth.existingSecret"
    value = "mongodb-auth-secret"
  }
  set {
    name  = "auth.usernames[0]"
    value = "admin"
  }
  set {
    name  = "auth.databases[0]"
    value = "auction_db"
  }
  set {
    name  = "persistence.enabled"
    value = "true"
  }
  set {
    name  = "persistence.size"
    value = "1Gi"
  }

  set {
    name  = "readinessProbe.initialDelaySeconds"
    value = "30"
  }
  set {
    name  = "readinessProbe.timeoutSeconds"
    value = "15"
  }
  set {
    name  = "readinessProbe.periodSeconds"
    value = "20"
  }
  set {
    name  = "livenessProbe.initialDelaySeconds"
    value = "60"
  }
  set {
    name  = "livenessProbe.timeoutSeconds"
    value = "15"
  }
  set {
    name  = "livenessProbe.periodSeconds"
    value = "20"
  }
}

# 8. Install Redis via Helm
resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.6.1"
  namespace  = "default"

  set {
    name  = "image.tag"
    value = "latest" 
  }

  set {
    name  = "architecture"
    value = "standalone"
  }

  set {
    name  = "auth.existingSecret"
    value = "redis-auth-secret"
  }
  set {
    name  = "auth.existingSecretPasswordKey"
    value = "redis-password"
  }
}