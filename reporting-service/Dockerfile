FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY reporting-service/.mvn/ .mvn
COPY reporting-service/mvnw ./
COPY aml-contracts /contracts
RUN ./mvnw -f /contracts/pom.xml install -DskipTests -B
COPY reporting-service/pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY reporting-service/src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
