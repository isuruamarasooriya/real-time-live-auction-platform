pipeline {
    agent any
    
    parameters {
        choice(name: 'SERVICE_NAME', choices: ['auto-detect', 'bidding-engine', 'auth-service', 'catalog-service', 'frontend'], description: 'Select the microservice to build, or let it auto-detect for webhooks')
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
                    if (params.SERVICE_NAME == 'auto-detect') {
                        def changedFiles = sh(script: 'git log -m -1 --name-only --pretty="format:" HEAD', returnStdout: true).trim()
                        
                        if (changedFiles.contains('bidding-engine/')) {
                            env.SERVICE_NAME = 'bidding-engine'
                        } else if (changedFiles.contains('auth-service/')) {
                            env.SERVICE_NAME = 'auth-service'
                        } else if (changedFiles.contains('catalog-service/')) {
                            env.SERVICE_NAME = 'catalog-service'
                        } else if (changedFiles.contains('frontend/')) {
                            env.SERVICE_NAME = 'frontend'
                        } else {
                            echo "No microservice changes detected. Defaulting to bidding-engine."
                            env.SERVICE_NAME = 'bidding-engine' 
                        }
                    } else {
                        env.SERVICE_NAME = params.SERVICE_NAME
                    }
                    
                    env.IMAGE_NAME = "isuruamarasooriya/${env.SERVICE_NAME}"
                    
                    echo "Target Microservice: ${env.SERVICE_NAME}"
                    echo "Target Image: ${env.IMAGE_NAME}"
                }
            }
        }

        stage('3. Build Docker Image') {
            steps {
                script {
                    echo "Building ${env.SERVICE_NAME} image..."
                    sh "docker build -t ${env.IMAGE_NAME}:${BUILD_NUMBER} ./${env.SERVICE_NAME}"
                }
            }
        }

        stage('4. Run Tests') {
            steps {
                script {
                    if (env.SERVICE_NAME == 'frontend') {
                        echo "Frontend tests are executed during the Docker build stage. Skipping here."
                    } else {
                        echo "Running unit tests inside the built image..."
                        sh "docker run --rm --user root -e NODE_ENV=development --entrypoint sh ${env.IMAGE_NAME}:${BUILD_NUMBER} -c 'npm install && npm test'"
                    }
                }
            }
        }

        stage('5. Trivy Security Scanning') {
            steps {
                script {
                    echo "Running Trivy Security Scanner..."
                    sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --no-progress ${env.IMAGE_NAME}:${BUILD_NUMBER}"
                }
            }
        }

        stage('6. Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                        echo "Pushing ${env.SERVICE_NAME} to Docker Hub..."
                        sh "docker push ${env.IMAGE_NAME}:${BUILD_NUMBER}"
                    }
                }
            }
        }

        stage('7. Clean Up Local Images') {
            steps {
                script {
                    echo "Cleaning up local docker images..."
                    sh "docker rmi ${env.IMAGE_NAME}:${BUILD_NUMBER} || true"
                }
            }
        }

        stage('8. GitOps Deployment') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'github-creds', passwordVariable: 'GIT_PASS', usernameVariable: 'GIT_USER')]) {
                        echo "Updating Kubernetes manifests for GitOps..."
                        sh "sed -i 's|image: .*/${env.SERVICE_NAME}:.*|image: ${env.IMAGE_NAME}:${BUILD_NUMBER}|g' k8s/${env.SERVICE_NAME}/deployment.yaml"
                        
                        sh """
                        git config user.name "Jenkins Pipeline"
                        git config user.email "jenkins@live-auction.com"
                        
                        git add k8s/${env.SERVICE_NAME}/deployment.yaml
                        git commit -m "chore: update ${env.SERVICE_NAME} image tag to \${BUILD_NUMBER} [skip ci]" || echo "No changes to commit"
                        git push https://\${GIT_USER}:\${GIT_PASS}@github.com/\${GITHUB_REPO}.git HEAD:main
                        """
                    }
                }
            }
        }
    }
}