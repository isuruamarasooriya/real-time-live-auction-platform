pipeline {
    agent any
    
    parameters {
        choice(name: 'SERVICE_NAME', choices: ['auto-detect', 'bidding-engine', 'auth-service', 'catalog-service', 'frontend', 'all'], description: 'Select the microservice to build, or let it auto-detect for webhooks')
    }

    environment {
        GITHUB_REPO = 'isuruamarasooriya/real-time-live-auction-platform'
        
        // React paths are already hardcoded
        // traffic based on relative paths without Domain/Port conflicts.
        FRONTEND_AUTH_URL = ''
        FRONTEND_CATALOG_URL = ''
        FRONTEND_BIDDING_URL = ''
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                checkout scm
                script {
                    def commitMessage = sh(script: 'git log -1 --pretty=%B HEAD', returnStdout: true).trim()
                    
                    if (commitMessage.contains('[skip ci]')) {
                        echo "Automated commit by Jenkins detected ([skip ci]). Stopping pipeline to prevent infinite loop!"
                        env.SKIP_CI = 'true'
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                }
            }
        }

        stage('2. Detect Changes (Auto-Detect)') {
            when { expression { env.SKIP_CI != 'true' } }
            steps {
                script {
                    def changedServices = []
                    
                    if (params.SERVICE_NAME == 'auto-detect') {
                        def changedFilesLines = sh(script: 'git log -m -1 --name-only --pretty="format:" HEAD', returnStdout: true).trim().split('\n')
                        def allServices = ['bidding-engine', 'auth-service', 'catalog-service', 'frontend']
                        
                        for (svc in allServices) {
                            if (changedFilesLines.any { it.startsWith("${svc}/") }) {
                                changedServices.add(svc)
                            }
                        }
                    } else if (params.SERVICE_NAME == 'all') {
                        changedServices = ['bidding-engine', 'auth-service', 'catalog-service', 'frontend']
                    } else {
                        changedServices.add(params.SERVICE_NAME)
                    }
                    
                    if (changedServices.isEmpty()) {
                        echo "No microservice source code changes detected. Skipping build."
                        env.CHANGED_SERVICES = ''
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                    
                    env.CHANGED_SERVICES = changedServices.join(',')
                    echo "Target Microservices to Build: ${env.CHANGED_SERVICES}"
                }
            }
        }

        stage('3. Run Tests (Pre-Build)') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        if (svc == 'frontend') {
                            echo "Frontend tests are executed during the Docker build stage. Skipping pre-build test here."
                        } else {
                            echo "Running unit tests for ${svc} BEFORE building the image (Fail Fast)..."
                            sh """
                            docker run --rm \
                              -v ${env.WORKSPACE}/${svc}:/app \
                              -w /app \
                              -e NODE_ENV=development \
                              node:22-alpine \
                              sh -c 'npm install && npm test'
                            """
                        }
                    }
                }
            }
        }

        stage('4. Build Docker Image') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        echo "Tests passed! Now building ${svc} image..."
                        
                        if (svc == 'frontend') {
                            sh """
                            docker build \
                              --build-arg VITE_AUTH_SERVICE_URL="${env.FRONTEND_AUTH_URL}" \
                              --build-arg VITE_CATALOG_SERVICE_URL="${env.FRONTEND_CATALOG_URL}" \
                              --build-arg VITE_BIDDING_ENGINE_URL="${env.FRONTEND_BIDDING_URL}" \
                              -t ${imageName}:${BUILD_NUMBER} ./${svc}
                            """
                        } else {
                            sh "docker build -t ${imageName}:${BUILD_NUMBER} ./${svc}"
                        }
                    }
                }
            }
        }

        stage('5. Trivy Security Scanning') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        echo "Running Trivy Security Scanner for ${svc}..."
                        sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --no-progress ${imageName}:${BUILD_NUMBER}"
                        // Temporarily remove (--exit-code 1) to review warnings without failing the pipeline. (Not suitable for production environments).
                    }
                }
            }
        }

        stage('6. Push to Docker Hub') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                        
                        def services = env.CHANGED_SERVICES.split(',')
                        for (svc in services) {
                            def imageName = "isuruamarasooriya/${svc}"
                            echo "Pushing ${svc} to Docker Hub..."
                            sh "docker push ${imageName}:${BUILD_NUMBER}"
                        }
                    }
                }
            }
        }

        stage('7. Clean Up Local Images') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        echo "Cleaning up local docker images for ${svc}..."
                        sh "docker rmi ${imageName}:${BUILD_NUMBER} || true"
                    }
                }
            }
        }

        stage('8. GitOps Deployment') {
            when { expression { env.CHANGED_SERVICES } }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'github-creds', passwordVariable: 'GIT_PASS', usernameVariable: 'GIT_USER')]) {
                        echo "Updating Kubernetes manifests for GitOps..."
                        
                        sh 'git config user.name "Jenkins Pipeline"'
                        sh 'git config user.email "jenkins@live-auction.com"'
                        
                        def services = env.CHANGED_SERVICES.split(',')
                        for (svc in services) {
                            def imageName = "isuruamarasooriya/${svc}"
                            sh "sed -i 's|image: .*/${svc}:.*|image: ${imageName}:${BUILD_NUMBER}|g' k8s/${svc}/deployment.yaml"
                            sh "git add k8s/${svc}/deployment.yaml"
                        }
                        
                        def commitMsg = "chore: update images for ${env.CHANGED_SERVICES} to tag ${BUILD_NUMBER} [skip ci]"
                        sh """
                        git commit -m "${commitMsg}" || echo "No changes to commit"
                        git push https://${GIT_USER}:${GIT_PASS}@github.com/${GITHUB_REPO}.git HEAD:main
                        """
                    }
                }
            }
        }
    }
}