<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $target_dir = "images/";
  $target_file = $target_dir . basename($_FILES["fileToUpload"]["name"]);
  move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $subdirs = array_diff(scandir('.'), array('.', '..'));
  $folder_data = array();
  foreach ($subdirs as $subdir) {
    if (is_dir($subdir)) { // Check if $subdir is a directory
      $images = glob("$subdir/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF}", GLOB_BRACE);
      $thumbnails = glob("$subdir/thumbnails/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF}", GLOB_BRACE);
      $folder_data[$subdir] = array(
          "image_count" => 0,
          "thumbnail_count" => 0,
          "image_urls" => array(),
          "thumbnail_urls" => array(),
          "image_sizes" => array(),
          "thumbnail_sizes" => array(),
      );
      if (count($images) > 0) {
        $folder_data[$subdir]["image_urls"] = array_map(function($image) use ($subdir) {
          return "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'] . $subdir . '/' . rawurlencode(str_replace($subdir.'/', '', $image));
        }, $images);
        $folder_data[$subdir]["image_sizes"] = array_map(function($image) {
          return filesize($image);
        }, $images);
        $folder_data[$subdir]["image_count"] = count($images);
      }
      if (count($thumbnails) > 0) {
        $folder_data[$subdir]["thumbnail_urls"] = array_map(function($thumbnail) use ($subdir) {
          return "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'] . $subdir . '/thumbnails/' . rawurlencode(str_replace($subdir.'/thumbnails/', '', $thumbnail));
        }, $thumbnails);
        $folder_data[$subdir]["thumbnail_sizes"] = array_map(function($thumbnail) {
          return filesize($thumbnail);
        }, $thumbnails);
        $folder_data[$subdir]["thumbnail_count"] = count($thumbnails);
      }
    }
  }
  if (count($folder_data) > 0) {
    header('Content-Type: application/json');
    echo json_encode($folder_data);
  }
}
?>