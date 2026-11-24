FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY scoring-service/.mvn/ .mvn
COPY scoring-service/mvnw ./
COPY aml-contracts /contracts
RUN ./mvnw -f /contracts/pom.xml install -DskipTests -B
COPY scoring-service/pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY scoring-service/src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
