import clsx from "clsx";
import {
  FaFile,
  FaFileExcel,
  FaFileImage,
  FaFileLines,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
  FaFileZipper,
} from "react-icons/fa6";
import type { IconType } from "react-icons/lib";

import { classifyFileType, type FileCategory } from "@/lib/files/file-format";

import styles from "./FileIcon.module.css";

const FILE_TYPE_ICONS: Record<FileCategory, IconType> = {
  pdf: FaFilePdf,
  doc: FaFileWord,
  xls: FaFileExcel,
  ppt: FaFilePowerpoint,
  img: FaFileImage,
  video: FaFileVideo,
  zip: FaFileZipper,
  txt: FaFileLines,
  unknown: FaFile,
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
