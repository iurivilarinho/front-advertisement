import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/card/Card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../../../components/input/Field";
import { Input } from "../../../components/input/Input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../../../components/input/InputGroup";
import { Button } from "../../../components/button/button";
import { useAuth } from "../../../app/provider/AuthProvider";
import { Spinner } from "../../../components/spinner/Spinner";

const loginFormSchema = z.object({
  username: z.string().min(1, "Informe o login"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormSchema = z.infer<typeof loginFormSchema>;

export const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { login, isLoading } = useAuth();

  const navigate = useNavigate();

  const onSubmit = async (data: LoginFormSchema) => {
    try {
      await login({ login: data.username, password: data.password });
      navigate("/", { replace: true });
    } catch (error) {}
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="w-1/3 min-w-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-center">
            Acesse sua conta
          </CardTitle>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Login</FieldLabel>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu login"
                {...register("username")}
              />
              {errors.username && (
                <FieldError>{errors.username.message}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Digite sua senha"
                  {...register("password")}
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                  >
                    {isPasswordVisible ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter>
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading && <Spinner />}
            Entrar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
