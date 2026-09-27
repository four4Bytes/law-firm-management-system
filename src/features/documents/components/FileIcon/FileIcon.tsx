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

import type { FileCategory } from "@/lib/files/file-types";

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
  category: FileCategory;
  className?: string;
}

export function FileIcon({ category, className }: FileIconProps) {
  const Icon = FILE_TYPE_ICONS[category];

  return <Icon className={clsx(styles.icon, className)} data-category={category} aria-hidden />;
}
