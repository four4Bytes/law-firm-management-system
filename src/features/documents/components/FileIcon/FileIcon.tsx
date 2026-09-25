import clsx from "clsx";
import {
  FaRegFile,
  FaRegFileExcel,
  FaRegFileImage,
  FaRegFileLines,
  FaRegFilePdf,
  FaRegFilePowerpoint,
  FaRegFileWord,
  FaRegFileZipper,
} from "react-icons/fa6";
import type { IconType } from "react-icons/lib";

import { classifyFileType, type FileCategory } from "@/lib/files/file-format";

import styles from "./FileIcon.module.css";

const FILE_TYPE_ICONS: Record<FileCategory, IconType> = {
  pdf: FaRegFilePdf,
  doc: FaRegFileWord,
  xls: FaRegFileExcel,
  ppt: FaRegFilePowerpoint,
  img: FaRegFileImage,
  zip: FaRegFileZipper,
  txt: FaRegFileLines,
  unknown: FaRegFile,
};

interface FileIconProps {
  fileType: string;
  className?: string;
}

export function FileIcon({ fileType, className }: FileIconProps) {
  const category = classifyFileType(fileType);
  const Icon = FILE_TYPE_ICONS[category];

  return <Icon className={clsx(styles.icon, className)} data-category={category} aria-hidden />;
}
