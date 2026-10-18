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

variable "grafana_admin_user" {
  description = "Admin username for Grafana"
  type        = string
  default     = "admin"
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}