pipeline {
    agent any
    
    parameters {
        choice(name: 'SERVICE_NAME', choices: ['bidding-engine', 'auth-service', 'catalog-service', 'frontend'], description: 'Select the microservice to build and deploy')
    }

    environment {
        GITHUB_REPO = 'isuruamarasooriya/real-time-live-auction-platform'
        IMAGE_NAME = "isuruamarasooriya/${params.SERVICE_NAME}"
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('2. Build Docker Image') {
            steps {
                script {
                    echo "Building ${params.SERVICE_NAME} image..."
                    sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} ./${params.SERVICE_NAME}"
                }
            }
        }

       stage('3. Run Tests') {
        steps {
            script {
                if (params.SERVICE_NAME == 'frontend') {
                    echo "Frontend tests are executed during the Docker build stage. Skipping here."
                } else {
                    echo "Running unit tests inside the built image..."
                    sh "docker run --rm --user root -e NODE_ENV=development --entrypoint sh ${IMAGE_NAME}:${BUILD_NUMBER} -c 'npm install && npm test'"
                    }
                }
            }
        }

        stage('4. Trivy Security Scanning') {
            steps {
                script {
                    echo "Running Trivy Security Scanner..."
                    sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --no-progress ${IMAGE_NAME}:${BUILD_NUMBER}"
                }
            }
        }

        stage('5. Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                        echo "Pushing ${params.SERVICE_NAME} to Docker Hub..."
                        sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
                    }
                }
            }
        }

        stage('6. Clean Up Local Images') {
            steps {
                script {
                    echo "Cleaning up local docker images..."
                    sh "docker rmi ${IMAGE_NAME}:${BUILD_NUMBER} || true"
                }
            }
        }

        stage('7. GitOps Deployment') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'github-creds', passwordVariable: 'GIT_PASS', usernameVariable: 'GIT_USER')]) {
                        echo "Updating Kubernetes manifests for GitOps..."
                        sh "sed -i 's|image: .*/${params.SERVICE_NAME}:.*|image: ${IMAGE_NAME}:${BUILD_NUMBER}|g' k8s/${params.SERVICE_NAME}/deployment.yaml"
                        
                        sh """
                        git config user.name "Jenkins Pipeline"
                        git config user.email "jenkins@live-auction.com"
                        
                        git add k8s/${params.SERVICE_NAME}/deployment.yaml
                        git commit -m "chore: update ${params.SERVICE_NAME} image tag to \${BUILD_NUMBER} [skip ci]"
                        git push https://\${GIT_USER}:\${GIT_PASS}@github.com/\${GITHUB_REPO}.git HEAD:main
                        """
                    }
                }
            }
        }
    }
}