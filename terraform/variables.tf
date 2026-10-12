variable "argocd_namespace" {
  description = "Namespace for ArgoCD"
  type        = string
  default     = "argocd"
}

variable "monitoring_namespace" {
  description = "Namespace for Prometheus and Grafana"
  type        = string
  default     = "monitoring"
}

variable "mongodb_root_password" {
  description = "Root password for MongoDB"
  type        = string
  sensitive   = true
}