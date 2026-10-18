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
    name  = "grafana.adminUser"
    value = var.grafana_admin_user
  }
  set {
    name  = "grafana.adminPassword"
    value = var.grafana_admin_password
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
    name  = "auth.rootPassword"
    value = var.mongodb_root_password
  }

  set {
    name  = "auth.usernames[0]"
    value = "admin"
  }

  set {
    name  = "auth.passwords[0]"
    value = var.mongodb_root_password
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
}