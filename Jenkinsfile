pipeline {
    agent any
    
    parameters {
        choice(name: 'SERVICE_NAME', choices: ['auto-detect', 'bidding-engine', 'auth-service', 'catalog-service', 'frontend', 'all'], description: 'Select the microservice to build, or let it auto-detect for webhooks')
    }

    environment {
        GITHUB_REPO = 'isuruamarasooriya/real-time-live-auction-platform'
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                checkout scm
                script {
                    def commitMessage = sh(script: 'git log -1 --pretty=%B HEAD', returnStdout: true).trim()
                    
                    if (commitMessage.contains('[skip ci]')) {
                        echo "Automated commit by Jenkins detected ([skip ci]). Stopping pipeline to prevent infinite loop!"
                        currentBuild.result = 'SUCCESS'
                        error("Skipped due to [skip ci]")
                    }
                }
            }
        }

        stage('2. Detect Changes (Auto-Detect)') {
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
                        currentBuild.result = 'SUCCESS'
                        error("Skipped: No microservice code changes detected") 
                    }
                    
                    env.CHANGED_SERVICES = changedServices.join(',')
                    echo "Target Microservices to Build: ${env.CHANGED_SERVICES}"
                }
            }
        }

        stage('3. Build Docker Image') {
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        echo "Building ${svc} image..."
                        sh "docker build -t ${imageName}:${BUILD_NUMBER} ./${svc}"
                    }
                }
            }
        }

        stage('4. Run Tests') {
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        if (svc == 'frontend') {
                            echo "Frontend tests are executed during the Docker build stage. Skipping here."
                        } else {
                            echo "Running unit tests inside the built image for ${svc}..."
                            sh "docker run --rm --user root -e NODE_ENV=development --entrypoint sh ${imageName}:${BUILD_NUMBER} -c 'npm install && npm test'"
                        }
                    }
                }
            }
        }

        stage('5. Trivy Security Scanning') {
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    for (svc in services) {
                        def imageName = "isuruamarasooriya/${svc}"
                        echo "Running Trivy Security Scanner for ${svc}..."
                        sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --no-progress ${imageName}:${BUILD_NUMBER}"
                    }
                }
            }
        }

        stage('6. Push to Docker Hub') {
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