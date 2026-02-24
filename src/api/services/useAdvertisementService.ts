// src/api/services/useAdvertisementService.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { resolveErrorMessage } from "../utils/resolveErrorMessage";
import type { MutationOptions, QueryOptions } from "../types";
import { advertisementApi } from "../clients/advertisementApi";
import type { AdvertisementApiDTO } from "../../types/advertisement";
import { queryClient } from "../../app/provider/TanStackQueryProvider";

/**
 * Regras:
 * - multipart/form-data em create/update
 * - imagens: enviar como fields repetidos images[i].*
 * - allowedDays: enviar repetido allowedDays=MONDAY... (ou allowedDays[0]... dependendo do binder)
 *
 * Se o binder do backend estiver exigindo outro padrão, ajuste apenas o buildFormData().
 */

const buildFormData = (
  payload: AdvertisementApiDTO | UpdateAdvertisementRequest,
) => {
  const fd = new FormData();

  fd.append("customerId", String(payload.customerId));
  fd.append("name", payload.name);
  fd.append("type", payload.type);
  fd.append("active", String(payload.active ?? true));

  // ✅ RECORRÊNCIA (novo)
  if (payload.recurrence?.startDate)
    fd.append("recurrence.startDate", payload.recurrence.startDate);
  if (payload.recurrence?.endDate)
    fd.append("recurrence.endDate", payload.recurrence.endDate);

  if (payload.recurrence?.intervalValue != null) {
    fd.append(
      "recurrence.intervalValue",
      String(payload.recurrence.intervalValue),
    );
  }

  if (payload.recurrence?.dailyDisplayCount != null) {
    fd.append(
      "recurrence.dailyDisplayCount",
      String(payload.recurrence.dailyDisplayCount),
    );
  }

  (payload.recurrence?.allowedDays ?? []).forEach((d) =>
    fd.append("recurrence.allowedDays", d),
  );

  if (payload.showSocialAtEnd != null) {
    fd.append("showSocialAtEnd", String(payload.showSocialAtEnd));
  }

  if (payload.videoUrl) fd.append("videoUrl", payload.videoUrl);
  if (payload.videoDurationSeconds != null) {
    fd.append("videoDurationSeconds", String(payload.videoDurationSeconds));
  }
  if (payload.video instanceof File) fd.append("video", payload.video);

  (payload.images ?? []).forEach((img, index) => {
    if (img.imageUrl) fd.append(`images[${index}].imageUrl`, img.imageUrl);
    fd.append(`images[${index}].displaySeconds`, String(img.displaySeconds));
    fd.append(`images[${index}].orderIndex`, String(img.orderIndex));
    if (img.image instanceof File)
      fd.append(`images[${index}].image`, img.image);
  });

  return fd;
};
export interface GetAdvertisementFilter {
  search?: string;
  active?: boolean;
  type?: string;
}

export interface CreateAdvertisementImageRequest {
  imageUrl?: string;
  displaySeconds: number;
  orderIndex: number;
  image?: File;
}

const createAdvertisement = async (
  payload: AdvertisementApiDTO,
): Promise<AdvertisementApiDTO> => {
  const formData = buildFormData(payload);
  const { data } = await advertisementApi.post("/advertisements", formData);
  return data;
};

export const useCreateAdvertisement = (
  options?: MutationOptions<AdvertisementApiDTO, AdvertisementApiDTO>,
) => {
  return useMutation({
    mutationFn: createAdvertisement,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });

      if (options?.showToast !== false) {
        const message =
          typeof options?.successMessage === "function"
            ? options.successMessage(data, variables)
            : options?.successMessage || "Anúncio criado com sucesso";
        toast.success(message);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage: options?.errorMessage || "Erro ao criar anúncio",
          }),
        );
      }
      options?.onError?.(error);
    },
  });
};

const getAdvertisementById = async (
  id: number,
): Promise<AdvertisementApiDTO> => {
  const { data } = await advertisementApi.get(`/advertisements/${id}`);
  return data;
};

export const useGetAdvertisementById = (
  id?: number,
  options?: QueryOptions<AdvertisementApiDTO>,
) => {
  const enabled = !!id && (options?.enabled ?? true);
  return useQuery({
    queryKey: ["advertisement", id],
    queryFn: () => getAdvertisementById(id!),
    ...options,
    enabled,
  });
};

export interface UpdateAdvertisementRequest extends AdvertisementApiDTO {
  id: number;
}

const updateAdvertisement = async (
  payload: UpdateAdvertisementRequest,
): Promise<AdvertisementApiDTO> => {
  const { id, ...rest } = payload;
  const formData = buildFormData(rest);
  const { data } = await advertisementApi.put(
    `/advertisements/${id}`,
    formData,
  );
  return data;
};

export const useUpdateAdvertisement = (
  options?: MutationOptions<AdvertisementApiDTO, UpdateAdvertisementRequest>,
) => {
  return useMutation({
    mutationFn: updateAdvertisement,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      queryClient.invalidateQueries({
        queryKey: ["advertisement", variables.id],
      });

      if (options?.showToast !== false) {
        const message =
          typeof options?.successMessage === "function"
            ? options.successMessage(data, variables)
            : options?.successMessage || "Anúncio atualizado com sucesso";
        toast.success(message);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage:
              options?.errorMessage || "Erro ao atualizar anúncio",
          }),
        );
      }

      options?.onError?.(error);
    },
  });
};

/**
 * Itens (imagens) no modo edição (padrão idêntico ao Checklist):
 * Como o backend não expõe endpoints específicos de imagens, estes hooks assumem endpoints auxiliares.
 * Se você NÃO tiver esses endpoints, remova estes hooks e faça update total via useUpdateAdvertisement.
 *
 * Abaixo estão rotas sugeridas (ajuste para seu backend real):
 * POST   /advertisements/{advertisementId}/images
 * PUT    /advertisements/{advertisementId}/images/{imageId}
 * DELETE /advertisements/{advertisementId}/images/{imageId}
 */

export interface AddAdvertisementImageRequest extends CreateAdvertisementImageRequest {
  advertisementId: number;
}

const addAdvertisementImage = async (
  payload: AddAdvertisementImageRequest,
): Promise<AdvertisementApiDTO> => {
  const { advertisementId, ...body } = payload;

  const fd = new FormData();
  if (body.imageUrl) fd.append("imageUrl", body.imageUrl);
  fd.append("displaySeconds", String(body.displaySeconds));
  fd.append("orderIndex", String(body.orderIndex));
  if (body.image instanceof File) fd.append("image", body.image);

  const { data } = await advertisementApi.post(
    `/advertisements/${advertisementId}/images`,
    fd,
  );
  return data;
};

export const useAddAdvertisementImage = (
  options?: MutationOptions<AdvertisementApiDTO, AddAdvertisementImageRequest>,
) => {
  return useMutation({
    mutationFn: addAdvertisementImage,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["advertisement", variables.advertisementId],
      });

      if (options?.showToast !== false) {
        const message =
          typeof options?.successMessage === "function"
            ? options.successMessage(data, variables)
            : options?.successMessage || "Imagem adicionada com sucesso";
        toast.success(message);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage:
              options?.errorMessage || "Erro ao adicionar imagem",
          }),
        );
      }
      options?.onError?.(error);
    },
  });
};

export interface UpdateAdvertisementImageRequest extends CreateAdvertisementImageRequest {
  advertisementId: number;
  imageId: number;
}

const updateAdvertisementImage = async (
  payload: UpdateAdvertisementImageRequest,
): Promise<AdvertisementApiDTO> => {
  const { advertisementId, imageId, ...body } = payload;

  const fd = new FormData();
  if (body.imageUrl) fd.append("imageUrl", body.imageUrl);
  fd.append("displaySeconds", String(body.displaySeconds));
  fd.append("orderIndex", String(body.orderIndex));
  if (body.image instanceof File) fd.append("image", body.image);

  const { data } = await advertisementApi.put(
    `/advertisements/${advertisementId}/images/${imageId}`,
    fd,
  );
  return data;
};

export const useUpdateAdvertisementImage = (
  options?: MutationOptions<
    AdvertisementApiDTO,
    UpdateAdvertisementImageRequest
  >,
) => {
  return useMutation({
    mutationFn: updateAdvertisementImage,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["advertisement", variables.advertisementId],
      });

      if (options?.showToast !== false) {
        const message =
          typeof options?.successMessage === "function"
            ? options.successMessage(data, variables)
            : options?.successMessage || "Imagem atualizada com sucesso";
        toast.success(message);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage:
              options?.errorMessage || "Erro ao atualizar imagem",
          }),
        );
      }
      options?.onError?.(error);
    },
  });
};

export interface RemoveAdvertisementImageRequest {
  advertisementId: number;
  imageId: number;
}

const removeAdvertisementImage = async (
  payload: RemoveAdvertisementImageRequest,
): Promise<AdvertisementApiDTO> => {
  const { data } = await advertisementApi.delete(
    `/advertisements/${payload.advertisementId}/images/${payload.imageId}`,
  );
  return data;
};

export const useRemoveAdvertisementImage = (
  options?: MutationOptions<
    AdvertisementApiDTO,
    RemoveAdvertisementImageRequest
  >,
) => {
  return useMutation({
    mutationFn: removeAdvertisementImage,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["advertisement", variables.advertisementId],
      });

      if (options?.showToast !== false) {
        const message =
          typeof options?.successMessage === "function"
            ? options.successMessage(data, variables)
            : options?.successMessage || "Imagem removida com sucesso";
        toast.success(message);
      }

      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (options?.showToast !== false) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage: options?.errorMessage || "Erro ao remover imagem",
          }),
        );
      }
      options?.onError?.(error);
    },
  });
};
