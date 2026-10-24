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

  values = [
    file("values/prometheus-stack-values.yaml")
  ]
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

  values = [
    templatefile("values/prometheus-adapter-values.yaml", { 
      namespace = kubernetes_namespace.monitoring.metadata[0].name 
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

  values = [
    file("values/mongodb-values.yaml")
  ]
}

# 8. Install Redis via Helm
resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.6.1"
  namespace  = "default"

  values = [
    file("values/redis-values.yaml")
  ]
}